import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IVendor extends Document {
  name: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  contactPerson?: string;
  rating?: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    name: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    taxNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      sparse: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Unique indexes with partial filters for email and tax number
vendorSchema.index({ email: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: false } });
vendorSchema.index({ taxNumber: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: false } });

export const Vendor = model<IVendor>('Vendor', vendorSchema);
