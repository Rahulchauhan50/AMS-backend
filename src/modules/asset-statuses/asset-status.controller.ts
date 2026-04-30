import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { AssetStatusService } from './asset-status.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

const validateTransitionsInput = (allowedTransitions: unknown) => {
  if (allowedTransitions === undefined) {
    return null;
  }

  if (!Array.isArray(allowedTransitions)) {
    return 'Allowed transitions must be an array';
  }

  for (const transition of allowedTransitions) {
    if (typeof transition !== 'string' || !transition.trim()) {
      return 'Each allowed transition must be a non-empty string';
    }
  }

  return null;
};

const buildDuplicateError = (duplicate: { name?: string; code?: string }) => {
  const errors = [];

  if (duplicate.name) {
    errors.push({ field: 'name', message: 'Status name already exists' });
  }

  if (duplicate.code) {
    errors.push({ field: 'code', message: 'Status code already exists' });
  }

  return errors;
};

export class AssetStatusController {
  static async createStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, code, description, allowedTransitions, isDefault } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Status name is required')));
      }

      if (!code || typeof code !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('code', 'Status code is required')));
      }

      const allowedTransitionsError = validateTransitionsInput(allowedTransitions);
      if (allowedTransitionsError) {
        return res.status(400).json(errorResponse('Validation failed', validationError('allowedTransitions', allowedTransitionsError)));
      }

      const duplicate = await AssetStatusService.findDuplicate({ name, code });
      if (duplicate) {
        return res.status(409).json(errorResponse('Validation failed', buildDuplicateError({ name, code })));
      }

      const status = await AssetStatusService.createStatus({
        name,
        code,
        description,
        allowedTransitions,
        isDefault,
      });

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: null,
        newValue: status,
      });

      return res.status(201).json(successResponse('Asset status created successfully', status));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.code === 11000) {
        return res.status(409).json(errorResponse('Validation failed', [{ field: 'name', message: 'Status name or code already exists' }]));
      }

      next(error);
    }
  }

  static async listStatuses(req: Request, res: Response, next: NextFunction) {
    try {
      const statuses = await AssetStatusService.listStatuses();
      return res.status(200).json(successResponse('Asset statuses retrieved successfully', statuses, { total: statuses.length }));
    } catch (error) {
      next(error);
    }
  }

  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await AssetStatusService.getStatusById(req.params.id as string);
      if (!status) {
        return res.status(404).json(errorResponse('Asset status not found'));
      }

      return res.status(200).json(successResponse('Asset status retrieved successfully', status));
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, allowedTransitions, isDefault } = req.body;

      if (name !== undefined && typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Status name must be a string')));
      }

      if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('description', 'Description must be a string')));
      }

      if (isDefault !== undefined && typeof isDefault !== 'boolean') {
        return res.status(400).json(errorResponse('Validation failed', validationError('isDefault', 'isDefault must be a boolean')));
      }

      const allowedTransitionsError = validateTransitionsInput(allowedTransitions);
      if (allowedTransitionsError) {
        return res.status(400).json(errorResponse('Validation failed', validationError('allowedTransitions', allowedTransitionsError)));
      }

      const oldStatus = await AssetStatusService.getStatusById(req.params.id as string);
      if (!oldStatus) {
        return res.status(404).json(errorResponse('Asset status not found'));
      }

      if (name !== undefined) {
        const duplicate = await AssetStatusService.findDuplicate({ name }, req.params.id as string);
        if (duplicate) {
          return res.status(409).json(errorResponse('Validation failed', buildDuplicateError({ name })));
        }
      }

      const status = await AssetStatusService.updateStatus(req.params.id as string, {
        name,
        description,
        allowedTransitions,
        isDefault,
      });

      if (!status) {
        return res.status(404).json(errorResponse('Asset status not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldStatus,
        newValue: status,
      });

      return res.status(200).json(successResponse('Asset status updated successfully', status));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async deleteStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const oldStatus = await AssetStatusService.getStatusById(req.params.id as string);
      if (!oldStatus) {
        return res.status(404).json(errorResponse('Asset status not found'));
      }

      const status = await AssetStatusService.deleteStatus(req.params.id as string);
      if (!status) {
        return res.status(404).json(errorResponse('Asset status not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldStatus,
        newValue: { isDeleted: true },
      });

      return res.status(200).json(successResponse('Asset status deleted successfully', status));
    } catch (error) {
      next(error);
    }
  }

  static async getTransitions(req: Request, res: Response, next: NextFunction) {
    try {
      const transitions = await AssetStatusService.getTransitionMap();
      return res.status(200).json(successResponse('Asset status transitions retrieved successfully', transitions, { total: transitions.length }));
    } catch (error) {
      next(error);
    }
  }
}