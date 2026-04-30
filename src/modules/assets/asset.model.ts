import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';
import { AssetLifecycleState } from '../../common/enums';

export interface IAsset extends Document {
  assetTag: string;
  name: string;
  serialNumber?: string;
  deviceModel?: string;
  categoryId: string;
  statusId: string;
  vendorId?: string;
  purchaseDate?: Date;
  warrantyDate?: Date;
  warrantyExtendedUntil?: Date;
  cost?: number;
  salvageValue?: number;
  usefulLifeYears?: number;
  depreciationMethod?: string;
  depreciationStartDate?: Date;
  accumulatedDepreciation?: number;
  currentBookValue?: number;
  locationId?: string;
  roomId?: string;
  lifecycleState?: AssetLifecycleState;
  licenseKey?: string;
  licenseName?: string;
  licenseVendor?: string;
  licenseExpiryDate?: Date;
  description?: string;
  barcodeData?: string;
  qrCodeData?: string;
  wifiMac?: string;
  lanMac?: string;
  splunkId?: string;
  ciscoId?: string;
  processor?: string;
  ram?: string;
  storage?: string;
  os?: string;
  desktopSerial?: string;
  assetUuid?: string;
  motherboardSerial?: string;
  graphicsCard?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    assetTag: {
      type: String,
      required: [true, 'Asset tag is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    deviceModel: {
      type: String,
      default: '',
      trim: true,
    },
    categoryId: {
    // Desktop-specific fields (B17)
    desktopSerial: {
      type: String,
      trim: true,
    },
    assetUuid: {
      type: String,
      trim: true,
      lowercase: true,
    },
    motherboardSerial: {
      type: String,
      trim: true,
    },
    graphicsCard: {
      type: String,
      default: '',
      trim: true,
    },
      type: String,
      ref: 'AssetCategory',
      required: [true, 'Category ID is required'],
    },
    statusId: {
      type: String,
      ref: 'AssetStatus',
      required: [true, 'Status ID is required'],
    },
    vendorId: {
      type: String,
      ref: 'Vendor',
    },
    purchaseDate: {
      type: Date,
    },
    warrantyDate: {
      type: Date,
    },
    warrantyExtendedUntil: {
      type: Date,
    },
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    salvageValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    usefulLifeYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    depreciationMethod: {
      type: String,
      default: 'STRAIGHT_LINE',
      trim: true,
    },
    depreciationStartDate: {
      type: Date,
    },
    accumulatedDepreciation: {
      type: Number,
      min: 0,
      default: 0,
    },
    currentBookValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    licenseKey: {
      type: String,
      default: '',
      trim: true,
    },
    licenseName: {
      type: String,
      default: '',
      trim: true,
    },
    licenseVendor: {
      type: String,
      default: '',
      trim: true,
    },
    licenseExpiryDate: {
      type: Date,
    },
    locationId: {
      type: String,
      ref: 'Location',
    },
    roomId: {
      type: String,
      ref: 'Room',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    barcodeData: {
      type: String,
      default: '',
    },
    qrCodeData: {
      type: String,
      default: '',
    },
    wifiMac: {
      type: String,
      trim: true,
      lowercase: true,
    },
    lanMac: {
      type: String,
      trim: true,
      lowercase: true,
    },
    splunkId: {
      type: String,
      trim: true,
    },
    ciscoId: {
      type: String,
      sparse: true,
      trim: true,
    },
    processor: {
      type: String,
      default: '',
      trim: true,
    },
    ram: {
      type: String,
      default: '',
      trim: true,
    },
    storage: {
      type: String,
      default: '',
      trim: true,
    },
    os: {
      type: String,
      default: '',
      trim: true,
    },
    lifecycleState: {
      type: String,
      enum: Object.values(AssetLifecycleState),
      default: AssetLifecycleState.AVAILABLE,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Unique indexes with partial filters for assetTag and serialNumber
assetSchema.index({ assetTag: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
assetSchema.index({ serialNumber: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: false } });

// Unique indexes for laptop-specific fields
assetSchema.index({ wifiMac: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: false, wifiMac: { $exists: true } } });
assetSchema.index({ lanMac: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: false, lanMac: { $exists: true } } });
assetSchema.index({ splunkId: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: false, splunkId: { $exists: true } } });
// Unique indexes for desktop-specific fields
assetSchema.index({ desktopSerial: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: false, desktopSerial: { $exists: true } } });
assetSchema.index({ assetUuid: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: false, assetUuid: { $exists: true } } });

export const Asset = model<IAsset>('Asset', assetSchema);
