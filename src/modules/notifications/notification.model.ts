import { Schema, model, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export interface INotification extends Document {
  userId: string;
  type: 'WARRANTY_EXPIRING' | 'LICENSE_EXPIRING' | 'MAINTENANCE_SCHEDULED' | 'ASSET_ASSIGNED' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  relatedAssetId?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['WARRANTY_EXPIRING', 'LICENSE_EXPIRING', 'MAINTENANCE_SCHEDULED', 'ASSET_ASSIGNED', 'SYSTEM_ALERT'],
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    relatedAssetId: {
      type: String,
      default: '',
    },
    relatedEntityId: {
      type: String,
      default: '',
    },
    relatedEntityType: {
      type: String,
      enum: ['asset', 'maintenance_request', 'assignment', 'maintenance_schedule'],
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
      default: '',
      trim: true,
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
