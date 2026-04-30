import express from 'express';
import MaintenanceScheduleController from './maintenance-schedule.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// All maintenance schedule routes require authentication and asset management permission
router.use(protect);
router.use(requirePermission('manage:assets'));

// Get upcoming maintenance reminders
router.get('/reminders/upcoming', MaintenanceScheduleController.getUpcomingReminders);

// List all maintenance schedules
router.get('/', MaintenanceScheduleController.listMaintenanceSchedules);

// Create maintenance schedule
router.post(
  '/',
  captureAuditContext({ module: 'maintenance-schedules', action: 'create', entity: 'MaintenanceSchedule' }),
  MaintenanceScheduleController.createMaintenanceSchedule
);

// Get maintenance schedule by ID
router.get('/:id', MaintenanceScheduleController.getMaintenanceSchedule);

// Update maintenance schedule
router.patch(
  '/:id',
  captureAuditContext({ module: 'maintenance-schedules', action: 'update', entity: 'MaintenanceSchedule' }),
  MaintenanceScheduleController.updateMaintenanceSchedule
);

// Record maintenance completed and calculate next service date
router.post(
  '/:id/completed',
  captureAuditContext({ module: 'maintenance-schedules', action: 'mark-completed', entity: 'MaintenanceSchedule' }),
  MaintenanceScheduleController.recordMaintenanceCompleted
);

// Delete maintenance schedule
router.delete(
  '/:id',
  captureAuditContext({ module: 'maintenance-schedules', action: 'delete', entity: 'MaintenanceSchedule' }),
  MaintenanceScheduleController.deleteMaintenanceSchedule
);

export default router;
