import { AuditLog } from '../audit-logs/audit-log.model';
import { ObservabilityService } from '../../common/observability/observability.service';

const toDateRange = (hours: number) => {
  const now = new Date();
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
};

export class AdminService {
  static async getMetrics() {
    const lastHour = toDateRange(1);
    const last24Hours = toDateRange(24);

    const [recentAuditLogs, recentAuditLogsLastHour, auditByModule, auditByAction] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: last24Hours } }),
      AuditLog.countDocuments({ createdAt: { $gte: lastHour } }),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: last24Hours } } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: last24Hours } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      runtime: ObservabilityService.getMetrics(),
      auditLogs: {
        lastHour: recentAuditLogsLastHour,
        last24Hours: recentAuditLogs,
        byModule: auditByModule.map(item => ({ module: item._id || 'unknown', count: item.count })),
        byAction: auditByAction.map(item => ({ action: item._id || 'unknown', count: item.count })),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  static async getLogsSummary() {
    const last24Hours = toDateRange(24);

    const [totalLogs, logsByModule, logsByAction, recentLogs] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: last24Hours } }),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: last24Hours } } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: last24Hours } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.find({ createdAt: { $gte: last24Hours } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('actorName actorEmail module action entity entityId createdAt'),
    ]);

    return {
      totalLogs,
      byModule: logsByModule.map(item => ({ module: item._id || 'unknown', count: item.count })),
      byAction: logsByAction.map(item => ({ action: item._id || 'unknown', count: item.count })),
      recentLogs,
      generatedAt: new Date().toISOString(),
    };
  }
}