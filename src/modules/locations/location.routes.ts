import { Router } from 'express';
import { LocationController } from './location.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

router.get('/', protect, requirePermission('manage:locations'), LocationController.listLocations);
router.get('/:id/assets', protect, requirePermission('manage:locations'), LocationController.getLocationAssets);
router.post(
  '/',
  protect,
  requirePermission('manage:locations'),
  captureAuditContext({ module: 'locations', action: 'create', entity: 'Location' }),
  LocationController.createLocation
);
router.get('/:id', protect, requirePermission('manage:locations'), LocationController.getLocation);
router.patch(
  '/:id',
  protect,
  requirePermission('manage:locations'),
  captureAuditContext({ module: 'locations', action: 'update', entity: 'Location' }),
  LocationController.updateLocation
);
router.delete(
  '/:id',
  protect,
  requirePermission('manage:locations'),
  captureAuditContext({ module: 'locations', action: 'delete', entity: 'Location' }),
  LocationController.deleteLocation
);

export default router;
