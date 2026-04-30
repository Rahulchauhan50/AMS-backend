import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

roleSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const Role = model<IRole>('Role', roleSchema);