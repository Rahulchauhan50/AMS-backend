import { Router } from 'express';
import FinanceController from './finance.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';

const router = Router();

router.use(protect);
router.use(requirePermission('manage:assets'));

router.get('/depreciation-summary', FinanceController.getDepreciationSummary);
router.get('/asset-value-summary', FinanceController.getAssetValueSummary);

export default router;