import express from 'express';
import { AssetLifecycleController } from './asset-lifecycle.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// All lifecycle routes require authentication and asset management permission
router.use(protect);
router.use(requirePermission('manage:assets'));

// Get valid transitions for a state
router.get('/transitions', AssetLifecycleController.getValidTransitions);

// Get lifecycle events for an asset
router.get('/:assetId', AssetLifecycleController.getLifecycleEvents);

// Transition asset to new lifecycle state
router.post(
  '/:assetId/transition',
  captureAuditContext({ module: 'assets', action: 'lifecycle-transition', entity: 'AssetLifecycleEvent' }),
  AssetLifecycleController.transitionAsset
);

export default router;
