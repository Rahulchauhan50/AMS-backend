import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export type EmployeeStatus = 'active' | 'inactive' | 'on-leave' | 'terminated';

export interface IEmployee extends Document {
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  manager?: string;
  status: EmployeeStatus;
  hrmsId?: string;
  syncedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    email: {
      type: String,
      sparse: true,
      trim: true,
    },
    phone: {
      type: String,
      sparse: true,
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    designation: {
      type: String,
      default: '',
      trim: true,
    },
    manager: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-leave', 'terminated'],
      default: 'active',
    },
    hrmsId: {
      type: String,
      sparse: true,
      trim: true,
    },
    syncedAt: {
      type: Date,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Unique index on employeeId with partial filter
employeeSchema.index({ employeeId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const Employee = model<IEmployee>('Employee', employeeSchema);
