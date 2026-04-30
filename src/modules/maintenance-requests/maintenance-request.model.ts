import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';
import { MaintenanceRequestStatus, MaintenanceRequestPriority } from '../../common/enums';

export interface IMaintenanceRequest extends Document {
  assetId: string;
  status: MaintenanceRequestStatus;
  priority: MaintenanceRequestPriority;
  assignedTechnician?: string;
  assignedVendor?: string;
  cost?: number;
  notes?: string;
  requestedBy?: string;
  startDate?: Date;
  completedDate?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    assetId: {
      type: String,
      ref: 'Asset',
      required: [true, 'Asset ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(MaintenanceRequestStatus),
      default: MaintenanceRequestStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(MaintenanceRequestPriority),
      default: MaintenanceRequestPriority.MEDIUM,
    },
    assignedTechnician: {
      type: String,
      default: '',
      trim: true,
    },
    assignedVendor: {
      type: String,
      default: '',
      trim: true,
    },
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    requestedBy: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

maintenanceRequestSchema.index({ assetId: 1, createdAt: -1 });
maintenanceRequestSchema.index({ status: 1, createdAt: -1 });

export const MaintenanceRequest = model<IMaintenanceRequest>('MaintenanceRequest', maintenanceRequestSchema);
