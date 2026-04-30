import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IPermission extends Document {
  code: string;
  name: string;
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    code: {
      type: String,
      required: [true, 'Permission code is required'],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

permissionSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const Permission = model<IPermission>('Permission', permissionSchema);