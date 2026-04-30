import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import AssignmentService from './assignment.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class AssignmentController {
  static async assignToEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId, reason } = req.body;
      const assetId = req.params.id;

      if (!employeeId || typeof employeeId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('employeeId', 'Employee ID is required')));
      }

      const performedBy: string = String((res.locals as any).user?.id || '');
      const reasonText: string | undefined = reason ? String(reason) : undefined;
      const assignment = await AssignmentService.assignToEmployee(String(assetId), String(employeeId), String(performedBy), reasonText ? String(reasonText) : undefined);

      if (assignment) {
        await AuditLogService.record(res.locals.auditContext, { oldValue: null, newValue: assignment });
      }

      return res.status(201).json(successResponse('Asset assigned to employee', assignment));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async unassignAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const assetId = req.params.id;

      const performedBy: string = String((res.locals as any).user?.id || '');
      const result = await AssignmentService.unassignAsset(String(assetId), String(performedBy));

      if (result) {
        await AuditLogService.record(res.locals.auditContext, { oldValue: null, newValue: result });
      }

      return res.status(200).json(successResponse('Asset unassigned', result));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async reassignToEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId, reason } = req.body;
      const assetId = req.params.id;

      if (!employeeId || typeof employeeId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('employeeId', 'Employee ID is required')));
      }

      const performedBy: string = String((res.locals as any).user?.id || '');
      const reasonText: string | undefined = reason ? String(reason) : undefined;
      const assignment = await AssignmentService.reassignToEmployee(String(assetId), String(employeeId), String(performedBy), reasonText ? String(reasonText) : undefined);

      if (assignment) {
        await AuditLogService.record(res.locals.auditContext, { oldValue: null, newValue: assignment });
      }

      return res.status(200).json(successResponse('Asset reassigned', assignment));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = (req.query.employeeId as string) || undefined;
      const assetId = (req.query.assetId as string) || undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const { assignments, total } = await AssignmentService.listAssignments({ employeeId, assetId, isActive }, page, limit);

      return res.status(200).json(successResponse('Assignments retrieved', assignments, { total, page, limit, pages: Math.ceil(total / limit) }));
    } catch (error) {
      next(error);
    }
  }
}

export default AssignmentController;
