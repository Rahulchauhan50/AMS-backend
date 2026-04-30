import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IAssetCategoryCustomField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options: string[];
}

export interface IAssetCategory extends Document {
  name: string;
  code: string;
  prefix: string;
  description?: string;
  customFields: IAssetCategoryCustomField[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customFieldSchema = new Schema<IAssetCategoryCustomField>(
  {
    name: {
      type: String,
      required: [true, 'Custom field name is required'],
      trim: true,
    },
    label: {
      type: String,
      required: [true, 'Custom field label is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'boolean'],
      required: [true, 'Custom field type is required'],
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const assetCategorySchema = new Schema<IAssetCategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Category code is required'],
      trim: true,
      uppercase: true,
    },
    prefix: {
      type: String,
      required: [true, 'Category prefix is required'],
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    customFields: {
      type: [customFieldSchema],
      default: [],
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

assetCategorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
assetCategorySchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
assetCategorySchema.index({ prefix: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const AssetCategory = model<IAssetCategory>('AssetCategory', assetCategorySchema);