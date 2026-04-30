import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../common/response/response.formatter';
import { AccessControlService } from './access-control.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class AccessControlController {
  static async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, permissions } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Role name is required')));
      }

      if (permissions !== undefined && !Array.isArray(permissions)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('permissions', 'Permissions must be an array')));
      }

      const role = await AccessControlService.createRole({ name, description, permissions });
      await AuditLogService.record(res.locals.auditContext, {
        oldValue: null,
        newValue: role,
      });
      return res.status(201).json(successResponse('Role created successfully', role));
    } catch (error) {
      next(error);
    }
  }

  static async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await AccessControlService.listRoles();
      return res.status(200).json(successResponse('Roles retrieved successfully', roles, { total: roles.length }));
    } catch (error) {
      next(error);
    }
  }

  static async getRole(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await AccessControlService.getRoleById(req.params.id as string);
      if (!role) {
        return res.status(404).json(errorResponse('Role not found'));
      }

      return res.status(200).json(successResponse('Role retrieved successfully', role));
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      if (name !== undefined && typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Role name must be a string')));
      }

      if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('description', 'Description must be a string')));
      }

      const role = await AccessControlService.updateRole(req.params.id as string, { name, description });
      if (!role) {
        return res.status(404).json(errorResponse('Role not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: null,
        newValue: role,
      });

      return res.status(200).json(successResponse('Role updated successfully', role));
    } catch (error) {
      next(error);
    }
  }

  static async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await AccessControlService.deleteRole(req.params.id as string);
      if (!role) {
        return res.status(404).json(errorResponse('Role not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: role,
        newValue: { isDeleted: true },
      });

      return res.status(200).json(successResponse('Role deleted successfully', role));
    } catch (error) {
      next(error);
    }
  }

  static async setRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('permissions', 'Permissions must be an array')));
      }

      const result = await AccessControlService.setRolePermissions(req.params.id as string, permissions);
      if (result.missing.includes('permissions')) {
        return res.status(400).json(errorResponse('Validation failed', validationError('permissions', 'Permissions must be a non-empty array of strings')));
      }

      if (!result.item) {
        return res.status(404).json(errorResponse('Role not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: null,
        newValue: result.item,
      });

      return res.status(200).json(successResponse('Role permissions updated successfully', result.item));
    } catch (error) {
      next(error);
    }
  }

  static async createPermission(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name, description } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('code', 'Permission code is required')));
      }

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Permission name is required')));
      }

      const permission = await AccessControlService.createPermission({ code, name, description });
      await AuditLogService.record(res.locals.auditContext, {
        oldValue: null,
        newValue: permission,
      });
      return res.status(201).json(successResponse('Permission created successfully', permission));
    } catch (error) {
      next(error);
    }
  }

  static async listPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await AccessControlService.listPermissions();
      return res.status(200).json(successResponse('Permissions retrieved successfully', permissions, { total: permissions.length }));
    } catch (error) {
      next(error);
    }
  }

  static async assignRolesToUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { roles } = req.body;

      if (!Array.isArray(roles)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('roles', 'Roles must be an array')));
      }

      const result = await AccessControlService.assignRolesToUser(req.params.id as string, roles);
      if (result.missing.length > 0) {
        return res.status(400).json(
          errorResponse(
            'Validation failed',
            result.missing.map((roleName) => ({ field: 'roles', message: `Role not found: ${roleName}` }))
          )
        );
      }

      if (!result.item) {
        return res.status(404).json(errorResponse('User not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: null,
        newValue: result.item,
      });

      return res.status(200).json(successResponse('Roles assigned successfully', result.item));
    } catch (error) {
      next(error);
    }
  }
}