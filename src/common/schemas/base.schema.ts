import { Schema } from 'mongoose';

export const baseSchemaFields = {
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
};

export const baseSchemaOptions = {
  timestamps: true, // Automatically handles createdAt and updatedAt
};
