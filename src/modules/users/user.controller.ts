import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { UserService } from './user.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, roles, status } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Name is required')));
      }

      if (!email || typeof email !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('email', 'Email is required')));
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('password', 'Password is required')));
      }

      if (roles !== undefined && !Array.isArray(roles)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('roles', 'Roles must be an array')));
      }

      if (status !== undefined && status !== 'active' && status !== 'inactive') {
        return res.status(400).json(errorResponse('Validation failed', validationError('status', 'Status must be active or inactive')));
      }

      const user = await UserService.createUser({ name, email, password, roles, status });

      if (user) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: user,
        });
      }

      return res.status(201).json(successResponse('User created successfully', user));
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json(
          errorResponse('Validation failed', [
            { field: 'email', message: 'Email already exists' },
          ])
        );
      }

      next(error);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await UserService.listUsers();
      return res.status(200).json(successResponse('Users retrieved successfully', users, { total: users.length }));
    } catch (error) {
      next(error);
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getUserById(req.params.id as string);
      if (!user) {
        return res.status(404).json(errorResponse('User not found'));
      }

      return res.status(200).json(successResponse('User retrieved successfully', user));
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, roles } = req.body;

      if (name !== undefined && typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Name must be a string')));
      }

      if (email !== undefined && typeof email !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('email', 'Email must be a string')));
      }

      if (roles !== undefined && !Array.isArray(roles)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('roles', 'Roles must be an array')));
      }

      const oldUser = await UserService.getUserById(req.params.id as string);
      const user = await UserService.updateUser(req.params.id as string, { name, email, roles });
      if (!user) {
        return res.status(404).json(errorResponse('User not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldUser,
        newValue: user,
      });

      return res.status(200).json(successResponse('User updated successfully', user));
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json(
          errorResponse('Validation failed', [
            { field: 'email', message: 'Email already exists' },
          ])
        );
      }

      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;

      if (status !== 'active' && status !== 'inactive') {
        return res.status(400).json(errorResponse('Validation failed', validationError('status', 'Status must be active or inactive')));
      }

      const oldUser = await UserService.getUserById(req.params.id as string);
      const user = await UserService.updateUserStatus(req.params.id as string, status);
      if (!user) {
        return res.status(404).json(errorResponse('User not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldUser,
        newValue: user,
      });

      return res.status(200).json(successResponse('User status updated successfully', user));
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { newPassword, password } = req.body;
      const passwordToUse = typeof newPassword === 'string' ? newPassword : password;

      if (!passwordToUse || typeof passwordToUse !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('newPassword', 'New password is required')));
      }

      const oldUser = await UserService.getUserById(req.params.id as string);
      const user = await UserService.resetPassword(req.params.id as string, passwordToUse);
      if (!user) {
        return res.status(404).json(errorResponse('User not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldUser,
        newValue: user,
      });

      return res.status(200).json(successResponse('Password reset successfully', user));
    } catch (error) {
      next(error);
    }
  }
}