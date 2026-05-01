import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';

export const AnalyticsController = {
  /**
   * Get dashboard metrics overview
   * GET /api/v1/analytics/dashboard
   */
  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await AnalyticsService.getDashboardMetrics();
      res.status(200).json(successResponse('Dashboard metrics retrieved successfully', metrics));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve dashboard metrics';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get assets grouped by category
   * GET /api/v1/analytics/assets-by-category
   */
  async getAssetsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const data = await AnalyticsService.getAssetsByCategory();
      res.status(200).json(successResponse('Assets by category retrieved successfully', data));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve assets by category';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get assets grouped by status
   * GET /api/v1/analytics/assets-by-status
   */
  async getAssetsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const data = await AnalyticsService.getAssetsByStatus();
      res.status(200).json(successResponse('Assets by status retrieved successfully', data));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve assets by status';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get maintenance request trends
   * GET /api/v1/analytics/maintenance-trends
   */
  async getMaintenanceTrends(req: Request, res: Response): Promise<void> {
    try {
      const trends = await AnalyticsService.getMaintenanceTrends();
      res.status(200).json(successResponse('Maintenance trends retrieved successfully', trends));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve maintenance trends';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get depreciation trends
   * GET /api/v1/analytics/depreciation-trends
   */
  async getDepreciationTrends(req: Request, res: Response): Promise<void> {
    try {
      const trends = await AnalyticsService.getDepreciationTrends();
      res.status(200).json(successResponse('Depreciation trends retrieved successfully', trends));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve depreciation trends';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },
};
