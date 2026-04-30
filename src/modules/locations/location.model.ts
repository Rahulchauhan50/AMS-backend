import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export type LocationType = 'office' | 'branch' | 'building' | 'floor';

export interface ILocation extends Document {
  name: string;
  type: LocationType;
  description?: string;
  address?: string;
  parentLocationId?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['office', 'branch', 'building', 'floor'],
      required: [true, 'Location type is required'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    parentLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

locationSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const Location = model<ILocation>('Location', locationSchema);
