import { Router } from 'express';
import { AssetStatusController } from './asset-status.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

router.get('/', protect, requirePermission('manage:asset-statuses'), AssetStatusController.listStatuses);
router.post(
  '/',
  protect,
  requirePermission('manage:asset-statuses'),
  captureAuditContext({ module: 'asset-statuses', action: 'create', entity: 'AssetStatus' }),
  AssetStatusController.createStatus
);
router.get('/transitions', protect, requirePermission('manage:asset-statuses'), AssetStatusController.getTransitions);
router.get('/:id', protect, requirePermission('manage:asset-statuses'), AssetStatusController.getStatus);
router.patch(
  '/:id',
  protect,
  requirePermission('manage:asset-statuses'),
  captureAuditContext({ module: 'asset-statuses', action: 'update', entity: 'AssetStatus' }),
  AssetStatusController.updateStatus
);
router.delete(
  '/:id',
  protect,
  requirePermission('manage:asset-statuses'),
  captureAuditContext({ module: 'asset-statuses', action: 'delete', entity: 'AssetStatus' }),
  AssetStatusController.deleteStatus
);

export default router;