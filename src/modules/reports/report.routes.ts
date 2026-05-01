import { Router } from 'express';
import { ReportController } from './report.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(protect);
router.use(requirePermission('view:reports'));

/**
 * GET /api/v1/reports/assets
 * Get asset report with aggregated statistics
 */
router.get('/assets', ReportController.getAssetReport);

/**
 * GET /api/v1/reports/employees
 * Get employee report with asset assignments
 */
router.get('/employees', ReportController.getEmployeeReport);

/**
 * GET /api/v1/reports/assignments
 * Get assignment report with current and historical assignments
 */
router.get('/assignments', ReportController.getAssignmentReport);

/**
 * GET /api/v1/reports/maintenance
 * Get maintenance report with request statistics
 */
router.get('/maintenance', ReportController.getMaintenanceReport);

/**
 * GET /api/v1/reports/warranty
 * Get warranty report with expiring warranties
 */
router.get('/warranty', ReportController.getWarrantyReport);

/**
 * GET /api/v1/reports/depreciation
 * Get depreciation report with financial summaries
 */
router.get('/depreciation', ReportController.getDepreciationReport);

export default router;
