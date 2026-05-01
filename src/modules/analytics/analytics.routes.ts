import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(protect);
router.use(requirePermission('view:analytics'));

/**
 * GET /api/v1/analytics/dashboard
 * Get dashboard metrics overview
 */
router.get('/dashboard', AnalyticsController.getDashboardMetrics);

/**
 * GET /api/v1/analytics/assets-by-category
 * Get assets grouped by category
 */
router.get('/assets-by-category', AnalyticsController.getAssetsByCategory);

/**
 * GET /api/v1/analytics/assets-by-status
 * Get assets grouped by status
 */
router.get('/assets-by-status', AnalyticsController.getAssetsByStatus);

/**
 * GET /api/v1/analytics/maintenance-trends
 * Get maintenance request trends
 */
router.get('/maintenance-trends', AnalyticsController.getMaintenanceTrends);

/**
 * GET /api/v1/analytics/depreciation-trends
 * Get depreciation trends
 */
router.get('/depreciation-trends', AnalyticsController.getDepreciationTrends);

export default router;
