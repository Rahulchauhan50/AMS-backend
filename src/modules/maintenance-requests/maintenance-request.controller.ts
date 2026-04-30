import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import MaintenanceRequestService from './maintenance-request.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { MaintenanceRequestStatus, MaintenanceRequestPriority } from '../../common/enums';

const validationError = (field: string, message: string) => [{ field, message }];

export class MaintenanceRequestController {
  static async createMaintenanceRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId, status, priority, assignedTechnician, assignedVendor, cost, notes } = req.body;

      if (!assetId) {
        return res.status(400).json(errorResponse('Validation failed', validationError('assetId', 'Asset ID is required')));
      }

      if (priority && !Object.values(MaintenanceRequestPriority).includes(priority)) {
        const validPriorities = Object.values(MaintenanceRequestPriority).join(', ');
        return res
          .status(400)
          .json(errorResponse('Validation failed', validationError('priority', `Priority must be one of: ${validPriorities}`)));
      }

      const requestedBy = String((res.locals as any).user?.id || '');
      const request = await MaintenanceRequestService.createMaintenanceRequest(
        String(assetId),
        status,
        priority,
        assignedTechnician ? String(assignedTechnician) : undefined,
        assignedVendor ? String(assignedVendor) : undefined,
        cost ? Number(cost) : undefined,
        notes ? String(notes) : undefined,
        requestedBy
      );

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { assetId: request.assetId, status: request.status, priority: request.priority },
      });

      return res.status(201).json(successResponse('Maintenance request created successfully', request));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async listMaintenanceRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const assetId = req.query.assetId as string | undefined;
      const status = req.query.status as string | undefined;

      const result = await MaintenanceRequestService.listMaintenanceRequests(assetId, status as any, page, limit);

      return res.status(200).json(successResponse('Maintenance requests retrieved successfully', result.requests, { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }));
    } catch (error) {
      next(error);
    }
  }

  static async getMaintenanceRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await MaintenanceRequestService.getMaintenanceRequest(String(req.params.id));
      return res.status(200).json(successResponse('Maintenance request retrieved successfully', request));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Maintenance request not found'));
      }

      next(error);
    }
  }

  static async updateMaintenanceRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { priority, assignedTechnician, assignedVendor, cost, notes } = req.body;

      if (priority && !Object.values(MaintenanceRequestPriority).includes(priority)) {
        const validPriorities = Object.values(MaintenanceRequestPriority).join(', ');
        return res
          .status(400)
          .json(errorResponse('Validation failed', validationError('priority', `Priority must be one of: ${validPriorities}`)));
      }

      const updates = {
        ...(priority && { priority }),
        ...(assignedTechnician !== undefined && { assignedTechnician: String(assignedTechnician) }),
        ...(assignedVendor !== undefined && { assignedVendor: String(assignedVendor) }),
        ...(cost !== undefined && { cost: Number(cost) }),
        ...(notes !== undefined && { notes: String(notes) }),
      };

      const request = await MaintenanceRequestService.updateMaintenanceRequest(String(req.params.id), updates);

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: updates,
      });

      return res.status(200).json(successResponse('Maintenance request updated successfully', request));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Maintenance request not found'));
      }

      next(error);
    }
  }

  static async updateMaintenanceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;

      if (!status || !Object.values(MaintenanceRequestStatus).includes(status)) {
        const validStatuses = Object.values(MaintenanceRequestStatus).join(', ');
        return res.status(400).json(errorResponse('Validation failed', validationError('status', `Status must be one of: ${validStatuses}`)));
      }

      const request = await MaintenanceRequestService.updateMaintenanceStatus(String(req.params.id), status);

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: { status: request.status },
        newValue: { status },
      });

      return res.status(200).json(successResponse('Maintenance request status updated successfully', request));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Maintenance request not found'));
      }

      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }
}

export default MaintenanceRequestController;
