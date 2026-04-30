import express from 'express';
import { AssetController } from './asset.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';
import AssignmentController from '../assignments/assignment.controller';
import lifecycleRoutes from './asset-lifecycle.routes';

const router = express.Router();

// All asset routes require authentication and permission to manage assets
router.use(protect);
router.use(requirePermission('manage:assets'));

// List all assets
router.get('/', AssetController.listAssets);

// Get expiring warranties
router.get('/warranty/expiring', AssetController.getExpiringWarranties);

// Get expiring licenses
router.get('/licenses/expiring', AssetController.getExpiringLicenses);

// Generate asset tag
router.post('/generate-tag', AssetController.generateAssetTag);

// Create a new asset
router.post(
  '/',
  captureAuditContext({ module: 'assets', action: 'create', entity: 'Asset' }),
  AssetController.createAsset
);

// Get asset by ID
router.get('/:id', AssetController.getAsset);

// Get asset timeline
router.get('/:id/timeline', AssetController.getAssetTimeline);

// Create asset depreciation
router.post(
  '/:id/depreciation',
  captureAuditContext({ module: 'assets', action: 'depreciate', entity: 'Asset' }),
  AssetController.createDepreciation
);

// Get asset depreciation
router.get('/:id/depreciation', AssetController.getAssetDepreciation);

// Get asset movements
router.get('/:id/movements', AssetController.getAssetMovements);

// Move asset
router.post(
  '/:id/move',
  captureAuditContext({ module: 'assets', action: 'move', entity: 'Asset' }),
  AssetController.moveAsset
);

// Get asset barcode
router.get('/:id/barcode', AssetController.getAssetBarcode);

// Get asset QR code
router.get('/:id/qr', AssetController.getAssetQRCode);

// Assign asset to room
router.post(
  '/:id/assign/room',
  captureAuditContext({ module: 'assets', action: 'assign', entity: 'Asset' }),
  AssetController.assignAssetToRoom
);

// Unassign asset from room
router.post(
  '/:id/unassign/room',
  captureAuditContext({ module: 'assets', action: 'unassign', entity: 'Asset' }),
  AssetController.unassignAssetFromRoom
);

// Reassign asset to room
router.post(
  '/:id/reassign/room',
  captureAuditContext({ module: 'assets', action: 'reassign', entity: 'Asset' }),
  AssetController.reassignAssetToRoom
);

// Assign asset to employee
router.post(
  '/:id/assign/employee',
  captureAuditContext({ module: 'assets', action: 'assign', entity: 'Assignment' }),
  AssignmentController.assignToEmployee
);

// Unassign asset
router.post(
  '/:id/unassign',
  captureAuditContext({ module: 'assets', action: 'unassign', entity: 'Assignment' }),
  AssignmentController.unassignAsset
);

// Reassign asset to another employee
router.post(
  '/:id/reassign/employee',
  captureAuditContext({ module: 'assets', action: 'reassign', entity: 'Assignment' }),
  AssignmentController.reassignToEmployee
);

// Get laptop details
router.get('/:id/laptop-details', AssetController.getLaptopDetails);

// Get desktop details
router.get('/:id/desktop-details', AssetController.getDesktopDetails);

// Update asset by ID
router.patch(
  '/:id',
  captureAuditContext({ module: 'assets', action: 'update', entity: 'Asset' }),
  AssetController.updateAsset
);

// Update laptop details
router.patch(
  '/:id/laptop-details',
  captureAuditContext({ module: 'assets', action: 'update', entity: 'Asset' }),
  AssetController.updateLaptopDetails
);

// Update desktop details
router.patch(
  '/:id/desktop-details',
  captureAuditContext({ module: 'assets', action: 'update', entity: 'Asset' }),
  AssetController.updateDesktopDetails
);

// Delete asset by ID
router.delete(
  '/:id',
  captureAuditContext({ module: 'assets', action: 'delete', entity: 'Asset' }),
  AssetController.deleteAsset
);

// Update warranty
router.patch(
  '/:id/warranty',
  captureAuditContext({ module: 'assets', action: 'update', entity: 'Asset' }),
  AssetController.updateWarranty
);

// Extend warranty
router.post(
  '/:id/warranty/extend',
  captureAuditContext({ module: 'assets', action: 'extend', entity: 'Asset' }),
  AssetController.extendWarranty
);

// Update license
router.patch(
  '/:id/license',
  captureAuditContext({ module: 'assets', action: 'update', entity: 'Asset' }),
  AssetController.updateLicense
);

// Mount lifecycle management routes under /lifecycle
router.use('/lifecycle', lifecycleRoutes);

export default router;
