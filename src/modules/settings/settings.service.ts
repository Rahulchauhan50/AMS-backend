import { SystemSettings, ISystemSettings } from './settings.model';

export class SettingsService {
  /**
   * Get all system settings
   * Returns the single settings document (creates default if not exists)
   */
  static async getSettings(): Promise<ISystemSettings> {
    let settings = await SystemSettings.findOne({ isDeleted: false }).lean().exec();

    if (!settings) {
      // Create default settings if none exist
      const newSettings = new SystemSettings({
        assetTagFormat: '{CATEGORY_PREFIX}-{SEQUENCE}',
        assetTagSequenceStart: 1,
        assetTagSequenceCounter: 1,
        warrantyReminderDays: 30,
        contractExpiryReminderDays: 30,
        maintenanceReminderDays: 7,
        licenseExpiryReminderDays: 30,
        fiscalYearStartMonth: 1,
        fiscalYearEndMonth: 12,
        defaultDepreciationMethod: 'STRAIGHT_LINE',
        defaultUsefulLifeYears: 5,
        defaultSalvageValuePercent: 10,
        maxFileSizeKB: 10240,
        allowedFileExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'jpeg', 'gif', 'txt', 'zip'],
        defaultMaintenancePriority: 'MEDIUM',
        globalSearchLimit: 100,
        enableFullTextSearch: true,
        defaultReportPageSize: 50,
        enableScheduledReports: false,
        enableAssetQRCodes: true,
        enableAssetBarcodes: true,
        enableDepreciation: true,
        enableCompliance: true,
        organizationName: 'Asset Management System',
        organizationEmail: 'admin@ams.local',
        supportPhoneNumber: '+1-800-SUPPORT',
        isDeleted: false,
      });

      await newSettings.save();
      settings = await SystemSettings.findOne({ isDeleted: false }).lean().exec();
    }

    return settings as ISystemSettings;
  }

  /**
   * Update system settings
   */
  static async updateSettings(
    data: Partial<ISystemSettings>,
    userId: string
  ): Promise<ISystemSettings> {
    // Get current settings
    const settings = await this.getSettings();

    // Validate notification days are positive
    if (data.warrantyReminderDays !== undefined && data.warrantyReminderDays < 0) {
      const err = new Error('Warranty reminder days must be non-negative') as any;
      err.statusCode = 400;
      err.errors = ['warrantyReminderDays must be >= 0'];
      throw err;
    }

    if (data.contractExpiryReminderDays !== undefined && data.contractExpiryReminderDays < 0) {
      const err = new Error('Contract expiry reminder days must be non-negative') as any;
      err.statusCode = 400;
      err.errors = ['contractExpiryReminderDays must be >= 0'];
      throw err;
    }

    if (data.maintenanceReminderDays !== undefined && data.maintenanceReminderDays < 0) {
      const err = new Error('Maintenance reminder days must be non-negative') as any;
      err.statusCode = 400;
      err.errors = ['maintenanceReminderDays must be >= 0'];
      throw err;
    }

    if (data.licenseExpiryReminderDays !== undefined && data.licenseExpiryReminderDays < 0) {
      const err = new Error('License expiry reminder days must be non-negative') as any;
      err.statusCode = 400;
      err.errors = ['licenseExpiryReminderDays must be >= 0'];
      throw err;
    }

    // Validate fiscal year months
    if (data.fiscalYearStartMonth !== undefined) {
      if (data.fiscalYearStartMonth < 1 || data.fiscalYearStartMonth > 12) {
        const err = new Error('Fiscal year start month must be between 1 and 12') as any;
        err.statusCode = 400;
        err.errors = ['fiscalYearStartMonth must be between 1 and 12'];
        throw err;
      }
    }

    if (data.fiscalYearEndMonth !== undefined) {
      if (data.fiscalYearEndMonth < 1 || data.fiscalYearEndMonth > 12) {
        const err = new Error('Fiscal year end month must be between 1 and 12') as any;
        err.statusCode = 400;
        err.errors = ['fiscalYearEndMonth must be between 1 and 12'];
        throw err;
      }
    }

    // Validate useful life years
    if (data.defaultUsefulLifeYears !== undefined && data.defaultUsefulLifeYears <= 0) {
      const err = new Error('Default useful life years must be positive') as any;
      err.statusCode = 400;
      err.errors = ['defaultUsefulLifeYears must be > 0'];
      throw err;
    }

    // Validate salvage value percent
    if (data.defaultSalvageValuePercent !== undefined) {
      if (data.defaultSalvageValuePercent < 0 || data.defaultSalvageValuePercent > 100) {
        const err = new Error('Default salvage value percent must be between 0 and 100') as any;
        err.statusCode = 400;
        err.errors = ['defaultSalvageValuePercent must be between 0 and 100'];
        throw err;
      }
    }

    // Validate file size
    if (data.maxFileSizeKB !== undefined && data.maxFileSizeKB <= 0) {
      const err = new Error('Max file size must be positive') as any;
      err.statusCode = 400;
      err.errors = ['maxFileSizeKB must be > 0'];
      throw err;
    }

    // Update settings
    const updated = await SystemSettings.findByIdAndUpdate(
      settings._id,
      {
        ...data,
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
      },
      { new: true, lean: true }
    ).exec();

    if (!updated) {
      const err = new Error('Failed to update settings') as any;
      err.statusCode = 500;
      err.errors = ['Settings update failed'];
      throw err;
    }

    return updated as ISystemSettings;
  }

  /**
   * Get specific setting by key
   */
  static async getSetting(key: string): Promise<any> {
    const settings = await this.getSettings();
    const value = (settings as any)[key];

    if (value === undefined) {
      const err = new Error(`Setting key "${key}" not found`) as any;
      err.statusCode = 404;
      err.errors = [`Setting key "${key}" not found`];
      throw err;
    }

    return { key, value };
  }

  /**
   * Update specific setting by key
   */
  static async updateSetting(key: string, value: any, userId: string): Promise<any> {
    const updateData: Record<string, any> = {};
    updateData[key] = value;

    const updated = await this.updateSettings(updateData, userId);
    return { key, value: (updated as any)[key] };
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettingsToDefaults(userId: string): Promise<ISystemSettings> {
    const defaultSettings = {
      assetTagFormat: '{CATEGORY_PREFIX}-{SEQUENCE}',
      assetTagSequenceStart: 1,
      assetTagSequenceCounter: 1,
      warrantyReminderDays: 30,
      contractExpiryReminderDays: 30,
      maintenanceReminderDays: 7,
      licenseExpiryReminderDays: 30,
      fiscalYearStartMonth: 1,
      fiscalYearEndMonth: 12,
      defaultDepreciationMethod: 'STRAIGHT_LINE',
      defaultUsefulLifeYears: 5,
      defaultSalvageValuePercent: 10,
      maxFileSizeKB: 10240,
      allowedFileExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'jpeg', 'gif', 'txt', 'zip'],
      defaultMaintenancePriority: 'MEDIUM',
      globalSearchLimit: 100,
      enableFullTextSearch: true,
      defaultReportPageSize: 50,
      enableScheduledReports: false,
      enableAssetQRCodes: true,
      enableAssetBarcodes: true,
      enableDepreciation: true,
      enableCompliance: true,
      organizationName: 'Asset Management System',
      organizationEmail: 'admin@ams.local',
      supportPhoneNumber: '+1-800-SUPPORT',
    };

    return this.updateSettings(defaultSettings, userId);
  }
}
