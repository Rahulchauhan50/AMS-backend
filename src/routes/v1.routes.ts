import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { successResponse } from '../common/response/response.formatter';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import accessControlRoutes from '../modules/access-control/access-control.routes';
import auditLogRoutes from '../modules/audit-logs/audit-log.routes';
import assetCategoryRoutes from '../modules/asset-categories/asset-category.routes';
import assetStatusRoutes from '../modules/asset-statuses/asset-status.routes';
import assetRoutes from '../modules/assets/asset.routes';
import locationRoutes from '../modules/locations/location.routes';
import roomRoutes from '../modules/rooms/room.routes';
import employeeRoutes from '../modules/employees/employee.routes';
import vendorRoutes from '../modules/vendors/vendor.routes';
import assignmentsRoutes from '../modules/assignments/assignment.routes';
import maintenanceRequestRoutes from '../modules/maintenance-requests/maintenance-request.routes';
import maintenanceScheduleRoutes from '../modules/maintenance-schedules/maintenance-schedule.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import documentRoutes from '../modules/documents/document.routes';
import reservationRoutes from '../modules/reservations/reservation.routes';
import trackingRoutes from '../modules/tracking/tracking.routes';
import financeRoutes from '../modules/finance/finance.routes';
import contractRoutes from '../modules/contracts/contract.routes';

const router = Router();

// Phase 01: Basic Foundation Endpoints
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json(successResponse('Server is healthy'));
});

router.get('/version', (req: Request, res: Response) => {
  res.status(200).json(successResponse('API version 1.0.0', { version: '1.0.0' }));
});

// Phase 02: DB Status Endpoint
router.get('/db/status', (req: Request, res: Response) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const status = states[mongoose.connection.readyState] || 'unknown';
  res.status(200).json(successResponse(`Database is ${status}`, { status }));
});

// Phase 03: Auth Routes
router.use('/auth', authRoutes);

// Phase 05: User management
router.use('/users', userRoutes);

// Phase 04: Roles, permissions, and access control
router.use('/', accessControlRoutes);

// Phase 06: Audit logging
router.use('/audit-logs', auditLogRoutes);

// Phase 07: Asset category management
router.use('/asset-categories', assetCategoryRoutes);

// Phase 08: Asset status management
router.use('/asset-statuses', assetStatusRoutes);

// Phase 09: Location management
router.use('/locations', locationRoutes);

// Phase 10: Room management
router.use('/rooms', roomRoutes);

// Phase 11: Employee listing and HRMS placeholder
router.use('/employees', employeeRoutes);

// Phase 12: Vendor and supplier base
router.use('/vendors', vendorRoutes);

// Phase 13: Core asset inventory model
router.use('/assets', assetRoutes);

// Phase 18: Assignment endpoints
router.use('/assignments', assignmentsRoutes);

// Phase 22: Maintenance request management
router.use('/maintenance-requests', maintenanceRequestRoutes);

// Phase 23: Preventive maintenance scheduling
router.use('/maintenance-schedules', maintenanceScheduleRoutes);

// Phase 25: Alerts and notification engine
router.use('/notifications', notificationRoutes);

// Phase 26: Document management
router.use('/documents', documentRoutes);

// Phase 27: Reservation and booking management
router.use('/reservations', reservationRoutes);

// Phase 28: Asset tracking and location monitoring
router.use('/tracking', trackingRoutes);

// Phase 29: Depreciation and financial management
router.use('/finance', financeRoutes);

// Phase 30: Contract management
router.use('/contracts', contractRoutes);

export default router;
