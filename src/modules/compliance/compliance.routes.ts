import { Router } from 'express';
import { ComplianceController } from './compliance.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

// Apply authentication to all routes
router.use(protect);
router.use(requirePermission('manage:compliance'));

/**
 * POST /api/v1/compliance/policies
 * Create a new compliance policy
 */
router.post(
  '/policies',
  captureAuditContext({ module: 'compliance', action: 'create_policy', entity: 'CompliancePolicy' }),
  ComplianceController.createPolicy
);

/**
 * GET /api/v1/compliance/policies
 * List compliance policies
 */
router.get('/policies', ComplianceController.listPolicies);

/**
 * GET /api/v1/compliance/policies/:id
 * Get compliance policy by ID
 */
router.get('/policies/:id', ComplianceController.getPolicyById);

/**
 * PATCH /api/v1/compliance/policies/:id
 * Update compliance policy
 */
router.patch(
  '/policies/:id',
  captureAuditContext({ module: 'compliance', action: 'update_policy', entity: 'CompliancePolicy' }),
  ComplianceController.updatePolicy
);

/**
 * DELETE /api/v1/compliance/policies/:id
 * Delete compliance policy
 */
router.delete(
  '/policies/:id',
  captureAuditContext({ module: 'compliance', action: 'delete_policy', entity: 'CompliancePolicy' }),
  ComplianceController.deletePolicy
);

/**
 * POST /api/v1/compliance/run-checks
 * Run compliance checks for a specific policy
 */
router.post(
  '/run-checks',
  captureAuditContext({ module: 'compliance', action: 'run_checks', entity: 'ComplianceCheck' }),
  ComplianceController.runChecks
);

/**
 * POST /api/v1/compliance/run-all
 * Run all enabled compliance policies
 */
router.post(
  '/run-all',
  captureAuditContext({ module: 'compliance', action: 'run_all_checks', entity: 'ComplianceCheck' }),
  ComplianceController.runAllChecks
);

/**
 * GET /api/v1/compliance/results
 * Get compliance results (filtered by policy or non-compliant only)
 */
router.get('/results', ComplianceController.getResults);

/**
 * GET /api/v1/compliance/results/:id
 * Get compliance result by ID
 */
router.get('/results/:id', ComplianceController.getResultById);

/**
 * GET /api/v1/compliance/summary
 * Get compliance summary statistics
 */
router.get('/summary', ComplianceController.getSummary);

export default router;
