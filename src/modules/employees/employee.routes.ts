import express from 'express';
import { EmployeeController } from './employee.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

// All employee routes require authentication
router.use(protect);

// List all employees (anyone can view)
router.get('/', EmployeeController.listEmployees);

// HRMS sync endpoint - requires manage:employees permission
router.post(
  '/sync',
  requirePermission('manage:employees'),
  captureAuditContext({ module: 'employees', action: 'sync', entity: 'Employee' }),
  EmployeeController.syncHRMS
);

// Get employee by ID (anyone can view)
router.get('/:id', EmployeeController.getEmployee);

// Get employee assigned assets (anyone can view)
router.get('/:id/assets', EmployeeController.getEmployeeAssets);

// Get employee history (anyone can view)
router.get('/:id/history', EmployeeController.getEmployeeHistory);

export default router;
