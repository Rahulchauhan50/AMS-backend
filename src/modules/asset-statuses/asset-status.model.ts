import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IAssetStatus extends Document {
  name: string;
  code: string;
  description?: string;
  allowedTransitions: string[];
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assetStatusSchema = new Schema<IAssetStatus>(
  {
    name: {
      type: String,
      required: [true, 'Status name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Status code is required'],
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    allowedTransitions: {
      type: [String],
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

assetStatusSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
assetStatusSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const AssetStatus = model<IAssetStatus>('AssetStatus', assetStatusSchema);