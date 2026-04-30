import { Schema, model, type Document as MongooseDocument } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IDocument extends MongooseDocument {
  fileName: string;
  fileType: 'INVOICE' | 'WARRANTY' | 'MANUAL' | 'CONTRACT' | 'MAINTENANCE_RECORD' | 'OTHER';
  mimeType: string;
  fileSize: number;
  filePath: string;
  relatedAssetId?: string;
  relatedVendorId?: string;
  relatedContractId?: string;
  relatedMaintenanceId?: string;
  description?: string;
  uploadedBy?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['INVOICE', 'WARRANTY', 'MANUAL', 'CONTRACT', 'MAINTENANCE_RECORD', 'OTHER'],
      default: 'OTHER',
      index: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: 0,
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
      unique: true,
      trim: true,
    },
    relatedAssetId: {
      type: String,
      index: true,
    },
    relatedVendorId: {
      type: String,
      index: true,
    },
    relatedContractId: {
      type: String,
      index: true,
    },
    relatedMaintenanceId: {
      type: String,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    uploadedBy: {
      type: String,
      default: '',
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

documentSchema.index({ relatedAssetId: 1, fileType: 1 });
documentSchema.index({ relatedVendorId: 1, fileType: 1 });
documentSchema.index({ uploadedBy: 1, createdAt: -1 });

export const Document = model<IDocument>('Document', documentSchema);
