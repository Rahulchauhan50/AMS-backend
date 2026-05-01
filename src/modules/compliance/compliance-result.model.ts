import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';
import { ComplianceCheckStatus } from '../../common/enums';

export interface IComplianceResult extends Document {
  policyId: string; // Reference to CompliancePolicy
  assetId: string; // Reference to Asset
  checkType: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT';
  severity: string;
  reason: string;
  details?: Record<string, any>;
  checkedAt: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const complianceResultSchema = new Schema<IComplianceResult>(
  {
    policyId: {
      type: String,
      required: [true, 'Policy ID is required'],
      ref: 'CompliancePolicy',
    },
    assetId: {
      type: String,
      required: [true, 'Asset ID is required'],
      ref: 'Asset',
    },
    checkType: {
      type: String,
      required: [true, 'Check type is required'],
      enum: ['ASSIGNED_OWNER', 'WARRANTY_DOCUMENT', 'ACTIVE_CONTRACT', 'VALID_LICENSE'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['COMPLIANT', 'NON_COMPLIANT'],
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    checkedAt: {
      type: Date,
      default: () => new Date(),
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Indexes for querying
complianceResultSchema.index({ policyId: 1 }, { partialFilterExpression: { isDeleted: false } });
complianceResultSchema.index({ assetId: 1 }, { partialFilterExpression: { isDeleted: false } });
complianceResultSchema.index({ status: 1 }, { partialFilterExpression: { isDeleted: false } });
complianceResultSchema.index({ severity: 1 }, { partialFilterExpression: { isDeleted: false } });
complianceResultSchema.index({ checkedAt: 1 }, { partialFilterExpression: { isDeleted: false } });
complianceResultSchema.index({ policyId: 1, status: 1 }, { partialFilterExpression: { isDeleted: false } });

export const ComplianceResult = model<IComplianceResult>('ComplianceResult', complianceResultSchema);
