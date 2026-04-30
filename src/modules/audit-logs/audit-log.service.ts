import { Types } from 'mongoose';
import { AuditLog, type IAuditLog } from './audit-log.model';

type AuditContext = {
  actorId?: string | null;
  actorName?: string;
  actorEmail?: string;
  module: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
};

type AuditFilters = {
  userId?: string;
  module?: string;
  entity?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: string;
};

const defaultSort: Record<string, 1 | -1> = { createdAt: -1 };

const parseSort = (sortValue?: string) => {
  if (!sortValue) {
    return defaultSort;
  }

  const [field, direction] = sortValue.split(':');
  if (!field) {
    return defaultSort;
  }

  return { [field]: direction === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
};

export class AuditLogService {
  static async record(context: AuditContext, values: { oldValue?: unknown; newValue?: unknown }) {
    return AuditLog.create({
      actorId: context.actorId ? new Types.ObjectId(context.actorId) : null,
      actorName: context.actorName || '',
      actorEmail: context.actorEmail || '',
      module: context.module,
      action: context.action,
      entity: context.entity,
      entityId: context.entityId || '',
      oldValue: values.oldValue ?? null,
      newValue: values.newValue ?? null,
      ipAddress: context.ipAddress || '',
      userAgent: context.userAgent || '',
    });
  }

  static async list(filters: AuditFilters) {
    const page = Number.isFinite(filters.page) && (filters.page || 0) > 0 ? Number(filters.page) : 1;
    const limit = Number.isFinite(filters.limit) && (filters.limit || 0) > 0 ? Number(filters.limit) : 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.userId) {
      query.actorId = filters.userId;
    }

    if (filters.module) {
      query.module = filters.module;
    }

    if (filters.entity) {
      query.entity = filters.entity;
    }

    if (filters.from || filters.to) {
      query.createdAt = {};

      if (filters.from) {
        (query.createdAt as Record<string, Date>).$gte = new Date(filters.from);
      }

      if (filters.to) {
        (query.createdAt as Record<string, Date>).$lte = new Date(filters.to);
      }
    }

    const sort = parseSort(filters.sort);

    const [items, total] = await Promise.all([
      AuditLog.find(query).sort(sort).skip(skip).limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }

  static async getById(auditLogId: string) {
    return AuditLog.findById(auditLogId);
  }
}