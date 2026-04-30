import { Router } from 'express';
import { AssetController } from '../assets/asset.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';

const router = Router();

router.use(protect);
router.use(requirePermission('manage:assets'));

router.get('/assets', AssetController.listTrackedAssets);

export default router;