import { Router } from 'express';
import { AccessControlController } from './access-control.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

router.get('/roles', protect, requirePermission('manage:roles'), AccessControlController.listRoles);
router.post('/roles', protect, requirePermission('manage:roles'), captureAuditContext({ module: 'access-control', action: 'create-role', entity: 'Role' }), AccessControlController.createRole);
router.get('/roles/:id', protect, requirePermission('manage:roles'), AccessControlController.getRole);
router.patch('/roles/:id', protect, requirePermission('manage:roles'), captureAuditContext({ module: 'access-control', action: 'update-role', entity: 'Role' }), AccessControlController.updateRole);
router.delete('/roles/:id', protect, requirePermission('manage:roles'), captureAuditContext({ module: 'access-control', action: 'delete-role', entity: 'Role' }), AccessControlController.deleteRole);
router.post('/roles/:id/permissions', protect, requirePermission('manage:roles'), captureAuditContext({ module: 'access-control', action: 'set-role-permissions', entity: 'Role' }), AccessControlController.setRolePermissions);

router.get('/permissions', protect, requirePermission('manage:permissions'), AccessControlController.listPermissions);
router.post('/permissions', protect, requirePermission('manage:permissions'), captureAuditContext({ module: 'access-control', action: 'create-permission', entity: 'Permission' }), AccessControlController.createPermission);

router.post('/users/:id/roles', protect, requirePermission('assign:roles'), captureAuditContext({ module: 'access-control', action: 'assign-user-roles', entity: 'User' }), AccessControlController.assignRolesToUser);

export default router;