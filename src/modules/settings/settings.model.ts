import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface ISystemSettings extends Document {
  // Asset tag format
  assetTagFormat: string; // e.g., "{CATEGORY_PREFIX}-{SEQUENCE}"
  assetTagSequenceStart: number;
  assetTagSequenceCounter: number;

  // Notification settings (days)
  warrantyReminderDays: number;
  contractExpiryReminderDays: number;
  maintenanceReminderDays: number;
  licenseExpiryReminderDays: number;

  // Fiscal year settings
  fiscalYearStartMonth: number; // 1-12
  fiscalYearEndMonth: number; // 1-12

  // Depreciation defaults
  defaultDepreciationMethod: string; // e.g., "STRAIGHT_LINE"
  defaultUsefulLifeYears: number;
  defaultSalvageValuePercent: number;

  // File upload settings
  maxFileSizeKB: number;
  allowedFileExtensions: string[]; // e.g., ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "png"]

  // Maintenance settings
  defaultMaintenancePriority: string; // e.g., "MEDIUM"
  maintenanceCategoryDefaults: Record<string, any>; // Category-specific settings

  // Search settings
  globalSearchLimit: number;
  enableFullTextSearch: boolean;

  // Report settings
  defaultReportPageSize: number;
  enableScheduledReports: boolean;

  // System flags
  enableAssetQRCodes: boolean;
  enableAssetBarcodes: boolean;
  enableDepreciation: boolean;
  enableCompliance: boolean;

  // Contact/Admin info
  organizationName: string;
  organizationEmail: string;
  supportPhoneNumber: string;

  // Metadata
  lastModifiedBy: string;
  lastModifiedAt: Date;

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    // Asset tag format
    assetTagFormat: {
      type: String,
      default: '{CATEGORY_PREFIX}-{SEQUENCE}',
      trim: true,
    },
    assetTagSequenceStart: {
      type: Number,
      default: 1,
    },
    assetTagSequenceCounter: {
      type: Number,
      default: 1,
    },

    // Notification settings (days)
    warrantyReminderDays: {
      type: Number,
      default: 30,
    },
    contractExpiryReminderDays: {
      type: Number,
      default: 30,
    },
    maintenanceReminderDays: {
      type: Number,
      default: 7,
    },
    licenseExpiryReminderDays: {
      type: Number,
      default: 30,
    },

    // Fiscal year settings
    fiscalYearStartMonth: {
      type: Number,
      default: 1,
      min: 1,
      max: 12,
    },
    fiscalYearEndMonth: {
      type: Number,
      default: 12,
      min: 1,
      max: 12,
    },

    // Depreciation defaults
    defaultDepreciationMethod: {
      type: String,
      default: 'STRAIGHT_LINE',
      trim: true,
    },
    defaultUsefulLifeYears: {
      type: Number,
      default: 5,
    },
    defaultSalvageValuePercent: {
      type: Number,
      default: 10,
    },

    // File upload settings
    maxFileSizeKB: {
      type: Number,
      default: 10240, // 10 MB
    },
    allowedFileExtensions: {
      type: [String],
      default: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'jpeg', 'gif', 'txt', 'zip'],
    },

    // Maintenance settings
    defaultMaintenancePriority: {
      type: String,
      default: 'MEDIUM',
      trim: true,
    },
    maintenanceCategoryDefaults: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Search settings
    globalSearchLimit: {
      type: Number,
      default: 100,
    },
    enableFullTextSearch: {
      type: Boolean,
      default: true,
    },

    // Report settings
    defaultReportPageSize: {
      type: Number,
      default: 50,
    },
    enableScheduledReports: {
      type: Boolean,
      default: false,
    },

    // System flags
    enableAssetQRCodes: {
      type: Boolean,
      default: true,
    },
    enableAssetBarcodes: {
      type: Boolean,
      default: true,
    },
    enableDepreciation: {
      type: Boolean,
      default: true,
    },
    enableCompliance: {
      type: Boolean,
      default: true,
    },

    // Contact/Admin info
    organizationName: {
      type: String,
      default: 'Asset Management System',
      trim: true,
    },
    organizationEmail: {
      type: String,
      default: 'admin@ams.local',
      trim: true,
      lowercase: true,
    },
    supportPhoneNumber: {
      type: String,
      default: '+1-800-SUPPORT',
      trim: true,
    },

    // Metadata
    lastModifiedBy: {
      type: String,
      trim: true,
    },
    lastModifiedAt: {
      type: Date,
    },

    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Index for efficient lookups
systemSettingsSchema.index({ isDeleted: 1 }, { partialFilterExpression: { isDeleted: false } });

export const SystemSettings = model<ISystemSettings>('SystemSettings', systemSettingsSchema);
