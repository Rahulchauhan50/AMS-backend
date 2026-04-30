import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export type RoomType = 'meeting' | 'conference' | 'training' | 'storage';

export interface IRoom extends Document {
  name: string;
  type: RoomType;
  description?: string;
  capacity?: number;
  locationId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['meeting', 'conference', 'training', 'storage'],
      required: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    capacity: {
      type: Number,
      default: 0,
    },
    locationId: {
      type: String,
      ref: 'Location',
      required: true,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Unique index on name and locationId combination to allow same room name in different locations
roomSchema.index(
  { name: 1, locationId: 1, isDeleted: 1 },
  { unique: true, sparse: true, partialFilterExpression: { isDeleted: false } }
);

export const Room = model<IRoom>('Room', roomSchema);
