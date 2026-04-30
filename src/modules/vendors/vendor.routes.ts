import express from 'express';
import { VendorController } from './vendor.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// All vendor routes require authentication and permission to manage vendors
router.use(protect);
router.use(requirePermission('manage:vendors'));

// List all vendors
router.get('/', VendorController.listVendors);

// Create a new vendor
router.post(
  '/',
  captureAuditContext({ module: 'vendors', action: 'create', entity: 'Vendor' }),
  VendorController.createVendor
);

// Get vendor by ID
router.get('/:id', VendorController.getVendor);

// Update vendor by ID
router.patch(
  '/:id',
  captureAuditContext({ module: 'vendors', action: 'update', entity: 'Vendor' }),
  VendorController.updateVendor
);

// Delete vendor by ID
router.delete(
  '/:id',
  captureAuditContext({ module: 'vendors', action: 'delete', entity: 'Vendor' }),
  VendorController.deleteVendor
);

export default router;
