import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { EmployeeService } from './employee.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

const isValidStatus = (status: unknown): status is 'active' | 'inactive' | 'on-leave' | 'terminated' => {
  return status === 'active' || status === 'inactive' || status === 'on-leave' || status === 'terminated';
};

export class EmployeeController {
  static async listEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const status = (req.query.status as string) || undefined;
      const department = (req.query.department as string) || undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

      if (status && !isValidStatus(status)) {
        return res.status(400).json(
          errorResponse('Validation failed', validationError('status', 'Status must be active, inactive, on-leave, or terminated'))
        );
      }

      const { employees, total } = await EmployeeService.listEmployees(status as any, department, page, limit);

      return res.status(200).json(
        successResponse('Employees retrieved successfully', employees, {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.getEmployeeById(req.params.id as string);

      return res.status(200).json(successResponse('Employee retrieved successfully', employee));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Employee not found'));
      }

      next(error);
    }
  }

  static async syncHRMS(req: Request, res: Response, next: NextFunction) {
    try {
      const syncResult = await EmployeeService.syncWithHRMS();

      if (syncResult.employees.length > 0) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: { synced: syncResult.synced, syncedAt: syncResult.syncedAt },
        });
      }

      return res.status(200).json(
        successResponse('HRMS sync completed successfully', syncResult.employees, {
          synced: syncResult.synced,
          syncedAt: syncResult.syncedAt,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getEmployeeAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const assetsInfo = await EmployeeService.getEmployeeAssets(req.params.id as string);

      return res.status(200).json(
        successResponse('Employee assets retrieved successfully', assetsInfo.assets, {
          employeeId: assetsInfo.employeeId,
          total: assetsInfo.total,
        })
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Employee not found'));
      }

      next(error);
    }
  }

  static async getEmployeeHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

      const historyInfo = await EmployeeService.getEmployeeHistory(req.params.id as string, page, limit);

      return res.status(200).json(
        successResponse('Employee history retrieved successfully', historyInfo.history, {
          employeeId: historyInfo.employeeId,
          total: historyInfo.total,
          page: historyInfo.page,
          limit: historyInfo.limit,
        })
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Employee not found'));
      }

      next(error);
    }
  }
}

export default EmployeeController;
