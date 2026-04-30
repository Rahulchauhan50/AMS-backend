import { Reservation, type IReservation, type ReservationStatus } from './reservation.model';
import { Asset } from '../assets/asset.model';

export class ReservationService {
  /**
   * Check if there are conflicting reservations for the given asset and date range
   */
  static async hasConflict(
    assetId: string,
    startDate: Date,
    endDate: Date,
    excludeReservationId?: string
  ): Promise<boolean> {
    const query: any = {
      assetId,
      status: { $in: ['PENDING', 'APPROVED'] },
      isDeleted: false,
      // Check if date ranges overlap
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    };

    if (excludeReservationId) {
      query._id = { $ne: excludeReservationId };
    }

    const conflictCount = await Reservation.countDocuments(query);
    return conflictCount > 0;
  }

  /**
   * Create a new reservation
   */
  static async createReservation(
    assetId: string,
    reservedBy: string,
    startDate: Date,
    endDate: Date,
    purpose?: string
  ): Promise<IReservation> {
    // Validate asset exists
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    // Validate date range
    if (startDate >= endDate) {
      const error = new Error('Invalid date range');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'dates', message: 'End date must be after start date' }];
      throw error;
    }

    // Check for conflicts
    const hasConflict = await this.hasConflict(assetId, startDate, endDate);
    if (hasConflict) {
      const error = new Error('Booking conflict');
      (error as any).statusCode = 409;
      (error as any).errors = [
        { field: 'dateRange', message: 'Asset is already booked for this date range' },
      ];
      throw error;
    }

    // Create reservation
    const reservation = await Reservation.create({
      assetId,
      reservedBy,
      startDate,
      endDate,
      purpose: purpose || '',
      status: 'PENDING',
    });

    return reservation;
  }

  /**
   * Get reservation by ID
   */
  static async getReservation(id: string): Promise<IReservation> {
    const reservation = await Reservation.findOne({ _id: id, isDeleted: false });
    if (!reservation) {
      const error = new Error('Reservation not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'id', message: 'Reservation does not exist' }];
      throw error;
    }
    return reservation;
  }

  /**
   * List reservations with optional filtering
   */
  static async listReservations(
    filters?: {
      assetId?: string;
      reservedBy?: string;
      status?: ReservationStatus;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ) {
    const query: any = { isDeleted: false };

    if (filters?.assetId) {
      query.assetId = filters.assetId;
    }
    if (filters?.reservedBy) {
      query.reservedBy = filters.reservedBy;
    }
    if (filters?.status) {
      query.status = filters.status;
    }

    // Date range filtering
    if (filters?.startDate || filters?.endDate) {
      query.$and = [];
      if (filters?.startDate) {
        query.$and.push({ endDate: { $gte: filters.startDate } });
      }
      if (filters?.endDate) {
        query.$and.push({ startDate: { $lte: filters.endDate } });
      }
    }

    const reservations = await Reservation.find(query)
      .sort({ startDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Reservation.countDocuments(query);

    return {
      reservations,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Update reservation (only allowed for PENDING status)
   */
  static async updateReservation(
    id: string,
    updates: {
      startDate?: Date;
      endDate?: Date;
      purpose?: string;
    }
  ): Promise<IReservation> {
    const reservation = await this.getReservation(id);

    // Only allow updates to PENDING reservations
    if (reservation.status !== 'PENDING') {
      const error = new Error('Cannot update non-pending reservation');
      (error as any).statusCode = 400;
      (error as any).errors = [
        { field: 'status', message: `Can only update PENDING reservations, current status: ${reservation.status}` },
      ];
      throw error;
    }

    const newStartDate = updates.startDate || reservation.startDate;
    const newEndDate = updates.endDate || reservation.endDate;

    // Validate new date range
    if (newStartDate >= newEndDate) {
      const error = new Error('Invalid date range');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'dates', message: 'End date must be after start date' }];
      throw error;
    }

    // Check for conflicts with the new dates
    if (updates.startDate || updates.endDate) {
      const hasConflict = await this.hasConflict(reservation.assetId, newStartDate, newEndDate, id);
      if (hasConflict) {
        const error = new Error('Booking conflict');
        (error as any).statusCode = 409;
        (error as any).errors = [
          { field: 'dateRange', message: 'Asset is already booked for this date range' },
        ];
        throw error;
      }
    }

    // Apply updates
    if (updates.startDate) {
      reservation.startDate = updates.startDate;
    }
    if (updates.endDate) {
      reservation.endDate = updates.endDate;
    }
    if (updates.purpose) {
      reservation.purpose = updates.purpose;
    }

    await reservation.save();
    return reservation;
  }

  /**
   * Approve a reservation
   */
  static async approveReservation(id: string, approvedBy: string, approvalNotes?: string): Promise<IReservation> {
    const reservation = await this.getReservation(id);

    if (reservation.status !== 'PENDING') {
      const error = new Error('Cannot approve non-pending reservation');
      (error as any).statusCode = 400;
      (error as any).errors = [
        { field: 'status', message: `Reservation is already ${reservation.status}` },
      ];
      throw error;
    }

    reservation.status = 'APPROVED';
    reservation.approvedBy = approvedBy;
    reservation.approvalNotes = approvalNotes || '';
    await reservation.save();

    return reservation;
  }

  /**
   * Reject a reservation
   */
  static async rejectReservation(id: string, rejectionReason: string): Promise<IReservation> {
    const reservation = await this.getReservation(id);

    if (reservation.status !== 'PENDING') {
      const error = new Error('Cannot reject non-pending reservation');
      (error as any).statusCode = 400;
      (error as any).errors = [
        { field: 'status', message: `Reservation is already ${reservation.status}` },
      ];
      throw error;
    }

    reservation.status = 'REJECTED';
    reservation.rejectionReason = rejectionReason;
    await reservation.save();

    return reservation;
  }

  /**
   * Cancel a reservation
   */
  static async cancelReservation(id: string): Promise<IReservation> {
    const reservation = await this.getReservation(id);

    if (reservation.status === 'REJECTED' || reservation.status === 'CANCELLED') {
      const error = new Error('Cannot cancel a rejected or already cancelled reservation');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'status', message: `Reservation status: ${reservation.status}` }];
      throw error;
    }

    reservation.status = 'CANCELLED';
    await reservation.save();

    return reservation;
  }

  /**
   * Delete (soft delete) a reservation
   */
  static async deleteReservation(id: string): Promise<IReservation> {
    const reservation = await this.getReservation(id);
    reservation.isDeleted = true;
    await reservation.save();
    return reservation;
  }

  /**
   * Get available slots for an asset within a date range
   */
  static async getAssetBookings(
    assetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ startDate: Date; endDate: Date; status: ReservationStatus }>> {
    const bookings = await Reservation.find({
      assetId,
      isDeleted: false,
      status: { $in: ['PENDING', 'APPROVED'] },
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    }).sort({ startDate: 1 });

    return bookings.map((b) => ({
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
    }));
  }

  /**
   * Get upcoming reservations for an asset
   */
  static async getUpcomingReservations(
    assetId: string,
    daysAhead: number = 30
  ): Promise<IReservation[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return Reservation.find({
      assetId,
      isDeleted: false,
      status: { $in: ['PENDING', 'APPROVED'] },
      startDate: { $gte: now, $lte: futureDate },
    }).sort({ startDate: 1 });
  }
}

export default ReservationService;
