import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IAssetImportJob extends Document {
  fileName: string;
  fileType: 'CSV' | 'XLS' | 'XLSX';
  status: 'PENDING' | 'PREVIEW' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  failedRows: number;
  columnMapping: Record<string, string>; // { csvColumn: assetField }
  preview?: Array<Record<string, any>>;
  importErrors?: Array<{ row: number; message: string }>;
  importedAssets?: string[]; // Array of asset IDs
  createdBy?: any; // inherited from baseSchemaFields
  completedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assetImportJobSchema = new Schema<IAssetImportJob>(
  {
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      enum: ['CSV', 'XLS', 'XLSX'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['PENDING', 'PREVIEW', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    totalRows: {
      type: Number,
      default: 0,
      min: 0,
    },
    validRows: {
      type: Number,
      default: 0,
      min: 0,
    },
    invalidRows: {
      type: Number,
      default: 0,
      min: 0,
    },
    importedRows: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedRows: {
      type: Number,
      default: 0,
      min: 0,
    },
    columnMapping: {
      type: Schema.Types.Mixed,
      default: {},
    },
    preview: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    importErrors: {
      type: [
        {
          row: { type: Number, required: true },
          message: { type: String, required: true },
        },
      ],
      default: [],
    },
    importedAssets: {
      type: [String],
      ref: 'Asset',
      default: [],
    },
    completedAt: {
      type: Date,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Indexes
assetImportJobSchema.index({ status: 1 }, { partialFilterExpression: { isDeleted: false } });
assetImportJobSchema.index({ createdBy: 1 }, { partialFilterExpression: { isDeleted: false } });
assetImportJobSchema.index({ createdAt: -1 }, { partialFilterExpression: { isDeleted: false } });

export const AssetImportJob = model<IAssetImportJob>('AssetImportJob', assetImportJobSchema);
