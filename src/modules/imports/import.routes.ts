import { Router } from 'express';
import { ImportController } from './import.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

// Apply authentication to all routes
router.use(protect);
router.use(requirePermission('manage:imports'));

/**
 * POST /api/v1/imports/suggest-columns
 * Get column suggestions for file headers
 */
router.post('/suggest-columns', ImportController.suggestColumns);

/**
 * POST /api/v1/imports/assets/preview
 * Create import preview
 */
router.post(
  '/assets/preview',
  captureAuditContext({ module: 'imports', action: 'create_preview', entity: 'AssetImport' }),
  ImportController.createImportPreview
);

/**
 * POST /api/v1/imports/assets/commit
 * Commit import
 */
router.post(
  '/assets/commit',
  captureAuditContext({ module: 'imports', action: 'commit', entity: 'AssetImport' }),
  ImportController.commitImport
);

/**
 * GET /api/v1/imports
 * List import jobs
 */
router.get('/', ImportController.listImportJobs);

/**
 * GET /api/v1/imports/:id
 * Get import job by ID
 */
router.get('/:id', ImportController.getImportJobById);

export default router;
