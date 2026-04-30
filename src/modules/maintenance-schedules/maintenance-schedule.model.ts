import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IMaintenanceSchedule extends Document {
  assetId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  nextServiceDate: Date;
  lastServiceDate?: Date;
  interval: number; // 1, 2, 3, 4, 12, etc.
  reminderDaysBefore?: number;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceScheduleSchema = new Schema<IMaintenanceSchedule>(
  {
    assetId: {
      type: String,
      ref: 'Asset',
      required: [true, 'Asset ID is required'],
      index: true,
    },
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
      default: 'MONTHLY',
      required: [true, 'Frequency is required'],
    },
    interval: {
      type: Number,
      required: [true, 'Interval is required'],
      min: [1, 'Interval must be at least 1'],
    },
    nextServiceDate: {
      type: Date,
      required: [true, 'Next service date is required'],
      index: true,
    },
    lastServiceDate: {
      type: Date,
    },
    reminderDaysBefore: {
      type: Number,
      default: 7,
      min: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

maintenanceScheduleSchema.index({ assetId: 1, nextServiceDate: 1 });
maintenanceScheduleSchema.index({ nextServiceDate: 1, isActive: 1 });

export const MaintenanceSchedule = model<IMaintenanceSchedule>('MaintenanceSchedule', maintenanceScheduleSchema);
