import { Router } from 'express';
import { UserController } from './user.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

router.get('/', protect, requirePermission('manage:users'), UserController.listUsers);
router.post(
	'/',
	protect,
	requirePermission('manage:users'),
	captureAuditContext({ module: 'users', action: 'create', entity: 'User' }),
	UserController.createUser
);
router.get('/:id', protect, requirePermission('manage:users'), UserController.getUser);
router.patch(
	'/:id',
	protect,
	requirePermission('manage:users'),
	captureAuditContext({ module: 'users', action: 'update', entity: 'User' }),
	UserController.updateUser
);
router.patch(
	'/:id/status',
	protect,
	requirePermission('manage:users'),
	captureAuditContext({ module: 'users', action: 'status-update', entity: 'User' }),
	UserController.updateStatus
);
router.post(
	'/:id/reset-password',
	protect,
	requirePermission('manage:users'),
	captureAuditContext({ module: 'users', action: 'reset-password', entity: 'User' }),
	UserController.resetPassword
);

export default router;