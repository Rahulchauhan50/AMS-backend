import express from 'express';
import MaintenanceRequestController from './maintenance-request.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// All maintenance request routes require authentication and asset management permission
router.use(protect);
router.use(requirePermission('manage:assets'));

// List all maintenance requests
router.get('/', MaintenanceRequestController.listMaintenanceRequests);

// Create maintenance request
router.post(
  '/',
  captureAuditContext({ module: 'maintenance-requests', action: 'create', entity: 'MaintenanceRequest' }),
  MaintenanceRequestController.createMaintenanceRequest
);

// Get maintenance request by ID
router.get('/:id', MaintenanceRequestController.getMaintenanceRequest);

// Update maintenance request details
router.patch(
  '/:id',
  captureAuditContext({ module: 'maintenance-requests', action: 'update', entity: 'MaintenanceRequest' }),
  MaintenanceRequestController.updateMaintenanceRequest
);

// Update maintenance request status
router.patch(
  '/:id/status',
  captureAuditContext({ module: 'maintenance-requests', action: 'update-status', entity: 'MaintenanceRequest' }),
  MaintenanceRequestController.updateMaintenanceStatus
);

export default router;
