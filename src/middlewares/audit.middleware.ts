import { Request, Response, NextFunction } from 'express';

type AuditContext = {
  module: string;
  action: string;
  entity: string;
};

export const captureAuditContext = (context: AuditContext) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentUser = (req as any).user;

    res.locals.auditContext = {
      ...context,
      actorId: currentUser?._id?.toString?.() || null,
      actorName: currentUser?.name || '',
      actorEmail: currentUser?.email || '',
      ipAddress: req.ip || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };

    next();
  };
};