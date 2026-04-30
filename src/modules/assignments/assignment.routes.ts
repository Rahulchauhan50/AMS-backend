import express from 'express';
import { AssignmentController } from './assignment.controller';
import { protect, requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = express.Router();

router.use(protect);
router.use(requirePermission('manage:assets'));

// List assignments
router.get('/', AssignmentController.listAssignments);

// For asset-scoped assign/unassign/reassign we mount handlers under asset router.

export default router;
