import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { successResponse } from '../common/response/response.formatter';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import accessControlRoutes from '../modules/access-control/access-control.routes';
import auditLogRoutes from '../modules/audit-logs/audit-log.routes';
import assetCategoryRoutes from '../modules/asset-categories/asset-category.routes';

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

export default router;
