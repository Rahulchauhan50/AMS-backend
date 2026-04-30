import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { AuditLogService } from './audit-log.service';

const parseNumber = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

export class AuditLogController {
  static async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuditLogService.list({
        userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
        module: typeof req.query.module === 'string' ? req.query.module : undefined,
        entity: typeof req.query.entity === 'string' ? req.query.entity : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
        page: parseNumber(req.query.page),
        limit: parseNumber(req.query.limit),
        sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
      });

      return res.status(200).json(
        successResponse('Audit logs retrieved successfully', result.items, {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLog(req: Request, res: Response, next: NextFunction) {
    try {
      const auditLog = await AuditLogService.getById(req.params.id as string);

      if (!auditLog) {
        return res.status(404).json(errorResponse('Audit log not found'));
      }

      return res.status(200).json(successResponse('Audit log retrieved successfully', auditLog));
    } catch (error) {
      next(error);
    }
  }
}