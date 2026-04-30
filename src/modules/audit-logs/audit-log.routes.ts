import { Router } from 'express';
import { AuditLogController } from './audit-log.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/', protect, requirePermission('manage:users'), AuditLogController.listAuditLogs);
router.get('/:id', protect, requirePermission('manage:users'), AuditLogController.getAuditLog);

export default router;