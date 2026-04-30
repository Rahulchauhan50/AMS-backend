import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import MaintenanceScheduleService from './maintenance-schedule.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class MaintenanceScheduleController {
  static async createMaintenanceSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId, frequency, interval, reminderDaysBefore, description, startDate } = req.body;

      if (!assetId) {
        return res.status(400).json(errorResponse('Validation failed', validationError('assetId', 'Asset ID is required')));
      }

      if (!frequency) {
        return res.status(400).json(errorResponse('Validation failed', validationError('frequency', 'Frequency is required')));
      }

      const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
      if (!validFrequencies.includes(frequency)) {
        return res
          .status(400)
          .json(errorResponse('Validation failed', validationError('frequency', `Frequency must be one of: ${validFrequencies.join(', ')}`)));
      }

      if (!interval || interval < 1) {
        return res.status(400).json(errorResponse('Validation failed', validationError('interval', 'Interval must be a positive number')));
      }

      const schedule = await MaintenanceScheduleService.createMaintenanceSchedule(
        String(assetId),
        frequency,
        Number(interval),
        reminderDaysBefore ? Number(reminderDaysBefore) : 7,
        description ? String(description) : undefined,
        startDate ? new Date(startDate) : undefined
      );

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { assetId: (schedule as any).assetId, frequency: (schedule as any).frequency, interval: (schedule as any).interval },
      });

      return res.status(201).json(successResponse('Maintenance schedule created successfully', schedule));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async listMaintenanceSchedules(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const assetId = req.query.assetId as string | undefined;
      const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
      const upcomingOnly = req.query.upcomingOnly === 'true';

      const result = await MaintenanceScheduleService.listMaintenanceSchedules(
        { assetId, isActive, upcomingOnly },
        page,
        limit
      );

      return res.status(200).json(
        successResponse('Maintenance schedules retrieved successfully', result.schedules, {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getMaintenanceSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const schedule = await MaintenanceScheduleService.getMaintenanceSchedule(String(req.params.id));
      return res.status(200).json(successResponse('Maintenance schedule retrieved successfully', schedule));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Maintenance schedule not found'));
      }

      next(error);
    }
  }

  static async updateMaintenanceSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { frequency, interval, nextServiceDate, reminderDaysBefore, description, isActive } = req.body;

      const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
      if (frequency && !validFrequencies.includes(frequency)) {
        return res
          .status(400)
          .json(errorResponse('Validation failed', validationError('frequency', `Frequency must be one of: ${validFrequencies.join(', ')}`)));
      }

      if (interval !== undefined && interval < 1) {
        return res.status(400).json(errorResponse('Validation failed', validationError('interval', 'Interval must be a positive number')));
      }

      const updates = {
        ...(frequency && { frequency }),
        ...(interval !== undefined && { interval: Number(interval) }),
        ...(nextServiceDate && { nextServiceDate: new Date(nextServiceDate) }),
        ...(reminderDaysBefore !== undefined && { reminderDaysBefore: Number(reminderDaysBefore) }),
        ...(description !== undefined && { description: String(description) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      };

      const schedule = await MaintenanceScheduleService.updateMaintenanceSchedule(String(req.params.id), updates);

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: updates,
      });

      return res.status(200).json(successResponse('Maintenance schedule updated successfully', schedule));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Maintenance schedule not found'));
      }

      next(error);
    }
  }

  static async recordMaintenanceCompleted(req: Request, res: Response, next: NextFunction) {
    try {
      const schedule = await MaintenanceScheduleService.recordMaintenanceCompleted(String(req.params.id));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'maintenance_completed', nextServiceDate: schedule.nextServiceDate },
      });

      return res.status(200).json(successResponse('Maintenance completed and next service date calculated', schedule));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Maintenance schedule not found'));
      }

      next(error);
    }
  }

  static async deleteMaintenanceSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const schedule = await MaintenanceScheduleService.deleteMaintenanceSchedule(String(req.params.id));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'schedule_deleted' },
      });

      return res.status(200).json(successResponse('Maintenance schedule deleted successfully', schedule));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Maintenance schedule not found'));
      }

      next(error);
    }
  }

  static async getUpcomingReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const daysAhead = Math.min(365, parseInt(req.query.daysAhead as string) || 30);
      const reminders = await MaintenanceScheduleService.getUpcomingReminders(daysAhead);

      return res.status(200).json(
        successResponse('Upcoming maintenance reminders retrieved successfully', reminders, {
          daysAhead,
          count: reminders.length,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

export default MaintenanceScheduleController;
