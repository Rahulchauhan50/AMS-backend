import { Schema, model, type Document as MongooseDocument } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';
import { AssetDepreciationMethod } from '../../common/enums';

export interface IDepreciationScheduleEntry {
  period: number;
  depreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
  periodDate: Date;
}

export interface IAssetDepreciation extends MongooseDocument {
  assetId: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: AssetDepreciationMethod;
  depreciationStartDate: Date;
  annualDepreciation: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  schedule: IDepreciationScheduleEntry[];
  asOfDate: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const depreciationEntrySchema = new Schema<IDepreciationScheduleEntry>(
  {
    period: { type: Number, required: true },
    depreciation: { type: Number, required: true, min: 0 },
    accumulatedDepreciation: { type: Number, required: true, min: 0 },
    bookValue: { type: Number, required: true, min: 0 },
    periodDate: { type: Date, required: true },
  },
  { _id: false }
);

const assetDepreciationSchema = new Schema<IAssetDepreciation>(
  {
    assetId: {
      type: String,
      ref: 'Asset',
      required: [true, 'Asset ID is required'],
      index: true,
    },
    purchaseCost: { type: Number, required: true, min: 0 },
    salvageValue: { type: Number, required: true, min: 0, default: 0 },
    usefulLifeYears: { type: Number, required: true, min: 1 },
    depreciationMethod: {
      type: String,
      enum: Object.values(AssetDepreciationMethod),
      default: AssetDepreciationMethod.STRAIGHT_LINE,
    },
    depreciationStartDate: { type: Date, required: true },
    annualDepreciation: { type: Number, required: true, min: 0 },
    monthlyDepreciation: { type: Number, required: true, min: 0 },
    accumulatedDepreciation: { type: Number, required: true, min: 0 },
    currentBookValue: { type: Number, required: true, min: 0 },
    schedule: { type: [depreciationEntrySchema], default: [] },
    asOfDate: { type: Date, required: true, default: Date.now },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

assetDepreciationSchema.index({ assetId: 1, asOfDate: -1, isDeleted: 1 });

export const AssetDepreciation = model<IAssetDepreciation>('AssetDepreciation', assetDepreciationSchema);
export default AssetDepreciation;