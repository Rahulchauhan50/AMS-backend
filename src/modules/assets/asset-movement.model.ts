import { Schema, model, type Document as MongooseDocument } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IAssetMovement extends MongooseDocument {
  assetId: string;
  fromLocationId?: string;
  fromRoomId?: string;
  toLocationId?: string;
  toRoomId?: string;
  movedBy: string;
  reason: string;
  movedDate: Date;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assetMovementSchema = new Schema<IAssetMovement>(
  {
    assetId: {
      type: String,
      ref: 'Asset',
      required: [true, 'Asset ID is required'],
      index: true,
    },
    fromLocationId: {
      type: String,
      ref: 'Location',
      default: '',
    },
    fromRoomId: {
      type: String,
      ref: 'Room',
      default: '',
    },
    toLocationId: {
      type: String,
      ref: 'Location',
      default: '',
      index: true,
    },
    toRoomId: {
      type: String,
      ref: 'Room',
      default: '',
      index: true,
    },
    movedBy: {
      type: String,
      ref: 'User',
      required: [true, 'Moved by user is required'],
    },
    reason: {
      type: String,
      required: [true, 'Movement reason is required'],
      trim: true,
    },
    movedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    latitude: {
      type: Number,
      default: undefined,
    },
    longitude: {
      type: Number,
      default: undefined,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

assetMovementSchema.index({ assetId: 1, movedDate: -1, isDeleted: 1 });

export const AssetMovement = model<IAssetMovement>('AssetMovement', assetMovementSchema);
export default AssetMovement;