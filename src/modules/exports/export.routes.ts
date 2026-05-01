import { Router } from 'express';
import { ExportController } from './export.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

// Apply authentication to all routes
router.use(protect);
router.use(requirePermission('manage:exports'));

/**
 * GET /api/v1/exports/assets.csv
 * Export assets to CSV
 */
router.get(
  '/assets.csv',
  captureAuditContext({ module: 'exports', action: 'export_csv', entity: 'Asset' }),
  ExportController.exportAssetsCSV
);

/**
 * GET /api/v1/exports/assets.xlsx
 * Export assets to XLSX
 */
router.get(
  '/assets.xlsx',
  captureAuditContext({ module: 'exports', action: 'export_xlsx', entity: 'Asset' }),
  ExportController.exportAssetsXLSX
);

/**
 * GET /api/v1/exports/assets.pdf
 * Export assets to PDF
 */
router.get(
  '/assets.pdf',
  captureAuditContext({ module: 'exports', action: 'export_pdf', entity: 'Asset' }),
  ExportController.exportAssetsPDF
);

/**
 * GET /api/v1/exports/audit-logs
 * Export audit logs to CSV
 */
router.get(
  '/audit-logs',
  captureAuditContext({ module: 'exports', action: 'export_audit_logs', entity: 'AuditLog' }),
  ExportController.exportAuditLogs
);

/**
 * GET /api/v1/exports/reports/asset-value-summary
 * Get asset value summary report
 */
router.get('/reports/asset-value-summary', ExportController.getAssetValueSummary);

export default router;
