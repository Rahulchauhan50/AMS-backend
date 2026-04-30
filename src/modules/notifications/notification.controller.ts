import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import NotificationService from './notification.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class NotificationController {
  static async getUserNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String((res.locals as any).user?.id || '');
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await NotificationService.getUserNotifications(userId, page, limit, unreadOnly);

      return res.status(200).json(
        successResponse('Notifications retrieved successfully', result.notifications, {
          total: result.total,
          unreadCount: result.unreadCount,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getNotificationById(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.getNotificationById(String(req.params.id));
      return res.status(200).json(successResponse('Notification retrieved successfully', notification));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Notification not found'));
      }

      next(error);
    }
  }

  static async markNotificationAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.markNotificationAsRead(String(req.params.id));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: { isRead: false },
        newValue: { isRead: true },
      });

      return res.status(200).json(successResponse('Notification marked as read', notification));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Notification not found'));
      }

      next(error);
    }
  }

  static async markAllNotificationsAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String((res.locals as any).user?.id || '');
      const result = await NotificationService.markAllNotificationsAsRead(userId);

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'mark_all_read', modifiedCount: result.modifiedCount },
      });

      return res.status(200).json(
        successResponse('All notifications marked as read', { modifiedCount: result.modifiedCount })
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.deleteNotification(String(req.params.id));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'notification_deleted' },
      });

      return res.status(200).json(successResponse('Notification deleted successfully', notification));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Notification not found'));
      }

      next(error);
    }
  }

  static async sendTestNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('email', 'Email is required')));
      }

      const userId = String((res.locals as any).user?.id || '');
      const notification = await NotificationService.sendTestNotification(userId, email);

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'test_notification_sent', email },
      });

      return res.status(201).json(successResponse('Test notification sent successfully', notification));
    } catch (error: any) {
      next(error);
    }
  }

  static async generateReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, daysThreshold } = req.body;
      const threshold = daysThreshold ? Math.min(365, Number(daysThreshold)) : 30;

      let result: any = { type };

      if (!type || typeof type !== 'string') {
        return res.status(400).json(
          errorResponse('Validation failed', validationError('type', 'Type is required (warranty_expiry or license_expiry)'))
        );
      }

      if (type === 'warranty_expiry') {
        result = await NotificationService.generateWarrantyExpiryReminders(threshold);
      } else if (type === 'license_expiry') {
        result = await NotificationService.generateLicenseExpiryReminders(threshold);
      } else {
        return res
          .status(400)
          .json(errorResponse('Validation failed', validationError('type', 'Type must be warranty_expiry or license_expiry')));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'reminders_generated', type, daysThreshold: threshold, count: result.count },
      });

      return res.status(200).json(successResponse(`Reminders generated successfully`, result));
    } catch (error) {
      next(error);
    }
  }
}

export default NotificationController;
