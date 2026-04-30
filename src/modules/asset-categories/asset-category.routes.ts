import { Router } from 'express';
import { AssetCategoryController } from './asset-category.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

router.get('/', protect, requirePermission('manage:asset-categories'), AssetCategoryController.listCategories);
router.post(
  '/',
  protect,
  requirePermission('manage:asset-categories'),
  captureAuditContext({ module: 'asset-categories', action: 'create', entity: 'AssetCategory' }),
  AssetCategoryController.createCategory
);
router.get('/:id', protect, requirePermission('manage:asset-categories'), AssetCategoryController.getCategory);
router.patch(
  '/:id',
  protect,
  requirePermission('manage:asset-categories'),
  captureAuditContext({ module: 'asset-categories', action: 'update', entity: 'AssetCategory' }),
  AssetCategoryController.updateCategory
);
router.delete(
  '/:id',
  protect,
  requirePermission('manage:asset-categories'),
  captureAuditContext({ module: 'asset-categories', action: 'delete', entity: 'AssetCategory' }),
  AssetCategoryController.deleteCategory
);

export default router;