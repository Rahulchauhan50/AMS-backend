import { Schema, model, type Document as MongooseDocument } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '../../common/schemas/base.schema';

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface IReservation extends MongooseDocument {
  assetId: string;
  reservedBy: string;
  startDate: Date;
  endDate: Date;
  status: ReservationStatus;
  purpose?: string;
  approvedBy?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const reservationSchema = new Schema<IReservation>(
  {
    assetId: {
      type: String,
      required: [true, 'Asset ID is required'],
      index: true,
    },
    reservedBy: {
      type: String,
      required: [true, 'Reserved by user ID is required'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    purpose: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: String,
      default: '',
    },
    approvalNotes: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

// Compound index for checking conflicts
reservationSchema.index(
  { assetId: 1, startDate: 1, endDate: 1, isDeleted: 1 },
  { name: 'asset_daterange_idx' }
);

// Index for listing user's reservations
reservationSchema.index(
  { reservedBy: 1, createdAt: -1, isDeleted: 1 },
  { name: 'user_reservations_idx' }
);

// Index for filtering by status
reservationSchema.index(
  { status: 1, startDate: 1, isDeleted: 1 },
  { name: 'status_startdate_idx' }
);

export const Reservation = model<IReservation>('Reservation', reservationSchema);
export default Reservation;
