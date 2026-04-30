import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';
import { ContractType, ContractStatus } from '../../common/enums';

export interface IContract extends Document {
  contractNumber: string;
  contractType: ContractType;
  status: ContractStatus;
  vendorId: string; // Reference to Vendor
  assetIds: string[]; // References to Assets
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  amount?: number;
  currency?: string;
  description?: string;
  terms?: string;
  renewalReminder?: number; // days before expiry
  isAutoRenewal?: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contractSchema = new Schema<IContract>(
  {
    contractNumber: {
      type: String,
      required: [true, 'Contract number is required'],
      unique: true,
      trim: true,
    },
    contractType: {
      type: String,
      required: [true, 'Contract type is required'],
      enum: Object.values(ContractType),
    },
    status: {
      type: String,
      required: [true, 'Contract status is required'],
      enum: Object.values(ContractStatus),
      default: ContractStatus.ACTIVE,
    },
    vendorId: {
      type: String,
      required: [true, 'Vendor ID is required'],
      ref: 'Vendor',
    },
    assetIds: {
      type: [String],
      ref: 'Asset',
      default: [],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    renewalDate: {
      type: Date,
    },
    amount: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    terms: {
      type: String,
      default: '',
      trim: true,
    },
    renewalReminder: {
      type: Number,
      default: 30, // 30 days before expiry
      min: 1,
    },
    isAutoRenewal: {
      type: Boolean,
      default: false,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Unique index for contract number with soft delete
contractSchema.index({ contractNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// Indexes for querying
contractSchema.index({ vendorId: 1 }, { partialFilterExpression: { isDeleted: false } });
contractSchema.index({ status: 1 }, { partialFilterExpression: { isDeleted: false } });
contractSchema.index({ endDate: 1 }, { partialFilterExpression: { isDeleted: false } });
contractSchema.index({ assetIds: 1 }, { partialFilterExpression: { isDeleted: false } });

export const Contract = model<IContract>('Contract', contractSchema);
