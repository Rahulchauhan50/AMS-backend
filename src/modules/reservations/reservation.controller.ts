import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import ReservationService from './reservation.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class ReservationController {
  static async createReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId, startDate, endDate, purpose } = req.body;

      if (!assetId || typeof assetId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('assetId', 'Asset ID is required')));
      }

      if (!startDate || isNaN(new Date(startDate).getTime())) {
        return res.status(400).json(errorResponse('Validation failed', validationError('startDate', 'Valid start date is required')));
      }

      if (!endDate || isNaN(new Date(endDate).getTime())) {
        return res.status(400).json(errorResponse('Validation failed', validationError('endDate', 'Valid end date is required')));
      }

      const reservedBy = String((res.locals as any).user?.id || '');
      const reservation = await ReservationService.createReservation(
        String(assetId),
        reservedBy,
        new Date(startDate),
        new Date(endDate),
        purpose ? String(purpose) : undefined
      );

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { assetId, startDate, endDate, purpose },
      });

      return res.status(201).json(successResponse('Reservation created successfully', reservation));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      if (error?.statusCode === 409) {
        return res.status(409).json(errorResponse('Booking conflict', error.errors));
      }

      next(error);
    }
  }

  static async listReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const assetId = req.query.assetId as string | undefined;
      const reservedBy = req.query.reservedBy as string | undefined;
      const status = req.query.status as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await ReservationService.listReservations(
        {
          assetId,
          reservedBy,
          status: status as any,
          startDate,
          endDate,
        },
        page,
        limit
      );

      return res.status(200).json(
        successResponse('Reservations retrieved successfully', result.reservations, {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await ReservationService.getReservation(String(req.params.id));
      return res.status(200).json(successResponse('Reservation retrieved successfully', reservation));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Reservation not found'));
      }

      next(error);
    }
  }

  static async updateReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, purpose } = req.body;

      const updates: any = {};

      if (startDate) {
        if (isNaN(new Date(startDate).getTime())) {
          return res.status(400).json(errorResponse('Validation failed', validationError('startDate', 'Valid start date is required')));
        }
        updates.startDate = new Date(startDate);
      }

      if (endDate) {
        if (isNaN(new Date(endDate).getTime())) {
          return res.status(400).json(errorResponse('Validation failed', validationError('endDate', 'Valid end date is required')));
        }
        updates.endDate = new Date(endDate);
      }

      if (purpose) {
        updates.purpose = String(purpose);
      }

      const reservation = await ReservationService.updateReservation(String(req.params.id), updates);

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'reservation_updated', updates },
      });

      return res.status(200).json(successResponse('Reservation updated successfully', reservation));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Reservation not found'));
      }

      if (error?.statusCode === 409) {
        return res.status(409).json(errorResponse('Booking conflict', error.errors));
      }

      next(error);
    }
  }

  static async approveReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { approvalNotes } = req.body;
      const approvedBy = String((res.locals as any).user?.id || '');

      const reservation = await ReservationService.approveReservation(
        String(req.params.id),
        approvedBy,
        approvalNotes ? String(approvalNotes) : undefined
      );

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'reservation_approved', reservationId: req.params.id },
      });

      return res.status(200).json(successResponse('Reservation approved successfully', reservation));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Reservation not found'));
      }

      next(error);
    }
  }

  static async rejectReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { rejectionReason } = req.body;

      if (!rejectionReason || typeof rejectionReason !== 'string') {
        return res
          .status(400)
          .json(errorResponse('Validation failed', validationError('rejectionReason', 'Rejection reason is required')));
      }

      const reservation = await ReservationService.rejectReservation(String(req.params.id), String(rejectionReason));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'reservation_rejected', reservationId: req.params.id, reason: rejectionReason },
      });

      return res.status(200).json(successResponse('Reservation rejected successfully', reservation));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Reservation not found'));
      }

      next(error);
    }
  }

  static async deleteReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await ReservationService.deleteReservation(String(req.params.id));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'reservation_deleted', reservationId: req.params.id },
      });

      return res.status(200).json(successResponse('Reservation deleted successfully', reservation));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Reservation not found'));
      }

      next(error);
    }
  }

  static async getAssetBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const assetId = String(req.params.assetId);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);

      if (isNaN(startDate.getTime())) {
        return res.status(400).json(errorResponse('Validation failed', validationError('startDate', 'Valid start date is required')));
      }

      if (isNaN(endDate.getTime())) {
        return res.status(400).json(errorResponse('Validation failed', validationError('endDate', 'Valid end date is required')));
      }

      if (startDate >= endDate) {
        return res
          .status(400)
          .json(errorResponse('Validation failed', validationError('dates', 'End date must be after start date')));
      }

      const bookings = await ReservationService.getAssetBookings(assetId, startDate, endDate);

      return res.status(200).json(
        successResponse('Asset bookings retrieved successfully', bookings, {
          assetId,
          startDate,
          endDate,
          count: bookings.length,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getUpcomingReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const assetId = String(req.params.assetId);
      const daysAhead = Math.min(365, parseInt(req.query.daysAhead as string) || 30);

      const reservations = await ReservationService.getUpcomingReservations(assetId, daysAhead);

      return res.status(200).json(
        successResponse('Upcoming reservations retrieved successfully', reservations, {
          assetId,
          daysAhead,
          count: reservations.length,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

export default ReservationController;
