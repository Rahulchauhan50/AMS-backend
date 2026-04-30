import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IAssignment extends Document {
  assetId: string;
  employeeId: string;
  assignedAt: Date;
  unassignedAt?: Date;
  assignedBy?: string;
  unassignedBy?: string;
  reason?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    assetId: {
      type: String,
      ref: 'Asset',
      required: [true, 'Asset ID is required'],
    },
    employeeId: {
      type: String,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
    },
    assignedAt: {
      type: Date,
      default: () => new Date(),
    },
    unassignedAt: {
      type: Date,
    },
    assignedBy: {
      type: String,
      default: '',
    },
    unassignedBy: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Ensure only one active assignment exists per asset
assignmentSchema.index({ assetId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isDeleted: false, isActive: true } });

export const Assignment = model<IAssignment>('Assignment', assignmentSchema);
