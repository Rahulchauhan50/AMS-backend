import { Router } from 'express';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { AdminController } from './admin.controller';

const router = Router();

router.use(protect);
router.use(requirePermission('manage:users'));

router.get('/metrics', AdminController.getMetrics);
router.get('/logs/summary', AdminController.getLogsSummary);

export default router;