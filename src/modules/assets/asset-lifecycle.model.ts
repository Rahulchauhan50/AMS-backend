import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';
import { AssetLifecycleState } from '../../common/enums';

export interface IAssetLifecycleEvent extends Document {
  assetId: string;
  oldState: AssetLifecycleState;
  newState: AssetLifecycleState;
  reason?: string;
  performedBy?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assetLifecycleSchema = new Schema<IAssetLifecycleEvent>(
  {
    assetId: {
      type: String,
      ref: 'Asset',
      required: [true, 'Asset ID is required'],
      index: true,
    },
    oldState: {
      type: String,
      enum: Object.values(AssetLifecycleState),
      required: [true, 'Old state is required'],
    },
    newState: {
      type: String,
      enum: Object.values(AssetLifecycleState),
      required: [true, 'New state is required'],
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    performedBy: {
      type: String,
      default: '',
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

assetLifecycleSchema.index({ assetId: 1, createdAt: -1 });

export const AssetLifecycleEvent = model<IAssetLifecycleEvent>('AssetLifecycleEvent', assetLifecycleSchema);
