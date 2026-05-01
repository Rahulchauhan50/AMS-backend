import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';
import { AuditLogService } from '../audit-logs/audit-log.service';

export const SettingsController = {
  /**
   * Get all system settings
   * GET /api/v1/settings
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await SettingsService.getSettings();
      res.status(200).json(successResponse('Settings retrieved successfully', settings));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve settings';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Update system settings
   * PATCH /api/v1/settings
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const userId = res.locals.userId as string;

      // Validate that some data is provided
      if (!data || Object.keys(data).length === 0) {
        res.status(400).json(
          errorResponse('No settings provided to update', ['At least one setting must be provided'])
        );
        return;
      }

      const updated = await SettingsService.updateSettings(data, userId);

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: data,
      });

      res.status(200).json(successResponse('Settings updated successfully', updated));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to update settings';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get specific setting by key
   * GET /api/v1/settings/:key
   */
  async getSetting(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params as { key: string };

      const setting = await SettingsService.getSetting(key);
      res.status(200).json(successResponse(`Setting "${key}" retrieved successfully`, setting));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve setting';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Update specific setting by key
   * PATCH /api/v1/settings/:key
   */
  async updateSetting(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params as { key: string };
      const { value } = req.body;
      const userId = res.locals.userId as string;

      if (value === undefined) {
        res.status(400).json(
          errorResponse('Value is required', ['Body must contain a "value" field'])
        );
        return;
      }

      const updated = await SettingsService.updateSetting(key, value, userId);

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: { [key]: value },
      });

      res.status(200).json(successResponse(`Setting "${key}" updated successfully`, updated));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to update setting';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Reset settings to defaults
   * POST /api/v1/settings/reset
   */
  async resetSettingsToDefaults(req: Request, res: Response): Promise<void> {
    try {
      const userId = res.locals.userId as string;

      const reset = await SettingsService.resetSettingsToDefaults(userId);

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: { action: 'reset_to_defaults' },
      });

      res.status(200).json(successResponse('Settings reset to defaults successfully', reset));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to reset settings';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },
};
