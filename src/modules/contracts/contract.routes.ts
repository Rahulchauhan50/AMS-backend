import { Router, Request, Response } from 'express';
import { ContractController } from './contract.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

// Apply authentication to all routes
router.use(protect);
router.use(requirePermission('manage:contracts'));

/**
 * POST /api/v1/contracts
 * Create a new contract
 */
router.post(
  '/',
  captureAuditContext({ module: 'contracts', action: 'create', entity: 'Contract' }),
  ContractController.createContract
);

/**
 * GET /api/v1/contracts
 * List contracts with pagination and filters
 */
router.get('/', ContractController.listContracts);

/**
 * GET /api/v1/contracts/expiring
 * Get contracts expiring soon (within renewal reminder days)
 * Note: This route must come before /:id routes to avoid conflict
 */
router.get('/expiring', ContractController.getExpiringContracts);

/**
 * GET /api/v1/contracts/summary
 * Get contract summary statistics
 */
router.get('/summary', ContractController.getContractSummary);

/**
 * GET /api/v1/contracts/vendor/:vendorId
 * Get contracts by vendor
 */
router.get('/vendor/:vendorId', ContractController.getContractsByVendor);

/**
 * GET /api/v1/contracts/asset/:assetId
 * Get contracts for an asset
 */
router.get('/asset/:assetId', ContractController.getContractsByAsset);

/**
 * GET /api/v1/contracts/:id
 * Get contract by ID
 */
router.get('/:id', ContractController.getContractById);

/**
 * PATCH /api/v1/contracts/:id
 * Update contract
 */
router.patch(
  '/:id',
  captureAuditContext({ module: 'contracts', action: 'update', entity: 'Contract' }),
  ContractController.updateContract
);

/**
 * DELETE /api/v1/contracts/:id
 * Delete contract (soft delete)
 */
router.delete(
  '/:id',
  captureAuditContext({ module: 'contracts', action: 'delete', entity: 'Contract' }),
  ContractController.deleteContract
);

export default router;
