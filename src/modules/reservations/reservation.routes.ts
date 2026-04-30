import express from 'express';
import ReservationController from './reservation.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// All reservation routes require authentication
router.use(protect);

// Create reservation (any authenticated user)
router.post(
  '/',
  captureAuditContext({ module: 'reservations', action: 'create', entity: 'Reservation' }),
  ReservationController.createReservation
);

// List reservations (any authenticated user)
router.get('/', ReservationController.listReservations);

// Get asset bookings for date range (any authenticated user)
router.get('/asset/:assetId/bookings', ReservationController.getAssetBookings);

// Get upcoming reservations for asset (any authenticated user)
router.get('/asset/:assetId/upcoming', ReservationController.getUpcomingReservations);

// Get specific reservation (any authenticated user)
router.get('/:id', ReservationController.getReservation);

// Update reservation - requires manage:assets permission (only for PENDING)
router.patch(
  '/:id',
  requirePermission('manage:assets'),
  captureAuditContext({ module: 'reservations', action: 'update', entity: 'Reservation' }),
  ReservationController.updateReservation
);

// Approve reservation - requires manage:assets permission
router.patch(
  '/:id/approve',
  requirePermission('manage:assets'),
  captureAuditContext({ module: 'reservations', action: 'approve', entity: 'Reservation' }),
  ReservationController.approveReservation
);

// Reject reservation - requires manage:assets permission
router.patch(
  '/:id/reject',
  requirePermission('manage:assets'),
  captureAuditContext({ module: 'reservations', action: 'reject', entity: 'Reservation' }),
  ReservationController.rejectReservation
);

// Delete reservation - requires manage:assets permission
router.delete(
  '/:id',
  requirePermission('manage:assets'),
  captureAuditContext({ module: 'reservations', action: 'delete', entity: 'Reservation' }),
  ReservationController.deleteReservation
);

export default router;
