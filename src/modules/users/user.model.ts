import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  status: 'active' | 'inactive';
  roles: string[];
  failedLoginAttempts: number;
  isLockedOut: boolean;
  lockedOutUntil?: Date;
  lastPasswordChangeAt?: Date;
  passwordExpiresAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    roles: {
      type: [String],
      default: ['IT Supervisor'], // Default role
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    isLockedOut: {
      type: Boolean,
      default: false,
      index: true,
    },
    lockedOutUntil: {
      type: Date,
      default: null,
    },
    lastPasswordChangeAt: {
      type: Date,
    },
    passwordExpiresAt: {
      type: Date,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Remove passwordHash from JSON responses
userSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
