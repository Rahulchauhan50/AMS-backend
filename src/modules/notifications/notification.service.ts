import { Notification, type INotification } from './notification.model';
import EmailService from './email.service';
import { AssetService } from '../assets/asset.service';

export type NotificationType = 'WARRANTY_EXPIRING' | 'LICENSE_EXPIRING' | 'MAINTENANCE_SCHEDULED' | 'ASSET_ASSIGNED' | 'SYSTEM_ALERT';

export class NotificationService {
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedAssetId?: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
    actionUrl?: string
  ) {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedAssetId: relatedAssetId || '',
      relatedEntityId: relatedEntityId || '',
      relatedEntityType: relatedEntityType || '',
      actionUrl: actionUrl || '',
      isRead: false,
    });

    return notification;
  }

  static async getUserNotifications(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    const query: any = { userId, isDeleted: false };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isDeleted: false, isRead: false });

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async getNotificationById(id: string) {
    const notification = await Notification.findOne({ _id: id, isDeleted: false });
    if (!notification) {
      const error = new Error('Notification not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'id', message: 'Notification does not exist' }];
      throw error;
    }
    return notification;
  }

  static async markNotificationAsRead(id: string) {
    const notification = await this.getNotificationById(id);

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  static async markAllNotificationsAsRead(userId: string) {
    const result = await Notification.updateMany(
      { userId, isDeleted: false, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return result;
  }

  static async deleteNotification(id: string) {
    const notification = await this.getNotificationById(id);
    notification.isDeleted = true;
    await notification.save();
    return notification;
  }

  static async generateWarrantyExpiryReminders(daysThreshold: number = 30) {
    try {
      const result = await AssetService.getExpiringWarranties(daysThreshold, 1, 1000);

      // For each asset with expiring warranty, create notification for facility managers
      // In a real system, you'd query users with specific roles
      const facilityManagerId = process.env.DEFAULT_FACILITY_MANAGER_ID || 'admin';

      for (const asset of result.assets) {
        const expiryDate = (asset as any).warrantyExtendedUntil || (asset as any).warrantyDate;
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        await this.createNotification(
          facilityManagerId,
          'WARRANTY_EXPIRING',
          `Warranty expiring for ${(asset as any).assetTag}`,
          `Asset ${(asset as any).assetTag} (${(asset as any).name}) warranty expires in ${daysUntilExpiry} days on ${expiryDate.toLocaleDateString()}.`,
          (asset as any)._id?.toString(),
          (asset as any)._id?.toString(),
          'asset',
          `/assets/${(asset as any)._id}`
        );

        // Send email notification
        await EmailService.sendEmail({
          to: process.env.FACILITY_MANAGER_EMAIL || 'admin@ams.local',
          subject: `Warranty Expiring: ${(asset as any).assetTag}`,
          html: EmailService.buildWarrantyExpiryEmailHtml(
            (asset as any).assetTag,
            (asset as any).name,
            expiryDate
          ),
        });
      }

      return { count: result.assets.length, daysThreshold };
    } catch (error) {
      console.error('Error generating warranty reminders:', error);
      return { count: 0, daysThreshold, error: (error as any).message };
    }
  }

  static async generateLicenseExpiryReminders(daysThreshold: number = 30) {
    try {
      const result = await AssetService.getExpiringLicenses(daysThreshold, 1, 1000);

      const facilityManagerId = process.env.DEFAULT_FACILITY_MANAGER_ID || 'admin';

      for (const asset of result.assets) {
        const expiryDate = (asset as any).licenseExpiryDate;
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        await this.createNotification(
          facilityManagerId,
          'LICENSE_EXPIRING',
          `License expiring: ${(asset as any).licenseName}`,
          `License ${(asset as any).licenseName} from ${(asset as any).licenseVendor} expires in ${daysUntilExpiry} days on ${expiryDate.toLocaleDateString()}.`,
          (asset as any)._id?.toString(),
          (asset as any)._id?.toString(),
          'asset',
          `/assets/${(asset as any)._id}`
        );

        // Send email notification
        await EmailService.sendEmail({
          to: process.env.FACILITY_MANAGER_EMAIL || 'admin@ams.local',
          subject: `License Expiring: ${(asset as any).licenseName}`,
          html: EmailService.buildLicenseExpiryEmailHtml(
            (asset as any).licenseName,
            (asset as any).licenseVendor,
            expiryDate
          ),
        });
      }

      return { count: result.assets.length, daysThreshold };
    } catch (error) {
      console.error('Error generating license reminders:', error);
      return { count: 0, daysThreshold, error: (error as any).message };
    }
  }

  static async sendTestNotification(userId: string, email: string) {
    try {
      // Create test notification
      const notification = await this.createNotification(
        userId,
        'SYSTEM_ALERT',
        'Test Notification',
        'This is a test notification to verify the notification system is working correctly.',
        '',
        '',
        '',
        '/dashboard'
      );

      // Send test email
      await EmailService.sendEmail({
        to: email,
        subject: 'Test Notification - AMS',
        html: '<h2>Test Notification</h2><p>This is a test email to verify the notification system is working correctly.</p>',
      });

      return notification;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

export default NotificationService;
