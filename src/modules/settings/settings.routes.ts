import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/auth.middleware';
import { captureAuditContext } from '../../middlewares/audit.middleware';

const router = Router();

// Apply authentication to all routes
router.use(protect);
router.use(requirePermission('manage:settings'));

/**
 * GET /api/v1/settings
 * Get all system settings
 */
router.get('/', SettingsController.getSettings);

/**
 * PATCH /api/v1/settings
 * Update system settings
 */
router.patch(
  '/',
  captureAuditContext({ module: 'settings', action: 'update_settings', entity: 'SystemSettings' }),
  SettingsController.updateSettings
);

/**
 * GET /api/v1/settings/:key
 * Get specific setting by key
 */
router.get('/:key', SettingsController.getSetting);

/**
 * PATCH /api/v1/settings/:key
 * Update specific setting by key
 */
router.patch(
  '/:key',
  captureAuditContext({ module: 'settings', action: 'update_setting', entity: 'SystemSettings' }),
  SettingsController.updateSetting
);

/**
 * POST /api/v1/settings/reset
 * Reset settings to defaults
 */
router.post(
  '/reset',
  captureAuditContext({ module: 'settings', action: 'reset_settings', entity: 'SystemSettings' }),
  SettingsController.resetSettingsToDefaults
);

export default router;
