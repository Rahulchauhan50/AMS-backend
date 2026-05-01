import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';
import { CompliancePolicySeverity } from '../../common/enums';

export interface ICompliancePolicy extends Document {
  name: string;
  description?: string;
  severity: CompliancePolicySeverity;
  categoryIds?: string[]; // Apply to specific asset categories
  checks: {
    checkType: string; // e.g., 'ASSIGNED_OWNER', 'WARRANTY_DOCUMENT', 'ACTIVE_CONTRACT', 'VALID_LICENSE'
    parameters?: Record<string, any>;
  }[];
  enabled: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const compliancePolicySchema = new Schema<ICompliancePolicy>(
  {
    name: {
      type: String,
      required: [true, 'Policy name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    severity: {
      type: String,
      required: [true, 'Severity is required'],
      enum: Object.values(CompliancePolicySeverity),
    },
    categoryIds: {
      type: [String],
      ref: 'AssetCategory',
      default: [],
    },
    checks: {
      type: [
        {
          checkType: {
            type: String,
            required: true,
            enum: ['ASSIGNED_OWNER', 'WARRANTY_DOCUMENT', 'ACTIVE_CONTRACT', 'VALID_LICENSE'],
          },
          parameters: {
            type: Schema.Types.Mixed,
            default: {},
          },
        },
      ],
      default: [],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Unique index for policy name
compliancePolicySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
compliancePolicySchema.index({ enabled: 1 }, { partialFilterExpression: { isDeleted: false } });

export const CompliancePolicy = model<ICompliancePolicy>('CompliancePolicy', compliancePolicySchema);
