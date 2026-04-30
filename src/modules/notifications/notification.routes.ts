import express from 'express';
import NotificationController from './notification.controller';
import { protect } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// All notification routes require authentication
router.use(protect);

// List user's notifications
router.get('/', NotificationController.getUserNotifications);

// Get specific notification
router.get('/:id', NotificationController.getNotificationById);

// Mark notification as read
router.patch(
  '/:id/read',
  captureAuditContext({ module: 'notifications', action: 'mark-read', entity: 'Notification' }),
  NotificationController.markNotificationAsRead
);

// Mark all notifications as read
router.post(
  '/mark-all-read',
  captureAuditContext({ module: 'notifications', action: 'mark-all-read', entity: 'Notification' }),
  NotificationController.markAllNotificationsAsRead
);

// Delete notification
router.delete(
  '/:id',
  captureAuditContext({ module: 'notifications', action: 'delete', entity: 'Notification' }),
  NotificationController.deleteNotification
);

// Send test notification
router.post(
  '/test',
  captureAuditContext({ module: 'notifications', action: 'test', entity: 'Notification' }),
  NotificationController.sendTestNotification
);

// Generate reminders (admin only)
router.post(
  '/generate/reminders',
  captureAuditContext({ module: 'notifications', action: 'generate-reminders', entity: 'Notification' }),
  NotificationController.generateReminders
);

export default router;
