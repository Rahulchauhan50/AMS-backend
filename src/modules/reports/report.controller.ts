import { Request, Response } from 'express';
import { ReportService } from './report.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';

export const ReportController = {
  /**
   * Get asset report
   * GET /api/v1/reports/assets
   */
  async getAssetReport(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string;
      const statusId = req.query.statusId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const report = await ReportService.getAssetReport({
        categoryId,
        statusId,
        startDate,
        endDate,
        limit,
      });

      res.status(200).json(successResponse('Asset report generated successfully', report));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to generate asset report';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get employee report
   * GET /api/v1/reports/employees
   */
  async getEmployeeReport(req: Request, res: Response): Promise<void> {
    try {
      const departmentId = req.query.departmentId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const report = await ReportService.getEmployeeReport({
        departmentId,
        limit,
      });

      res.status(200).json(successResponse('Employee report generated successfully', report));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to generate employee report';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get assignment report
   * GET /api/v1/reports/assignments
   */
  async getAssignmentReport(req: Request, res: Response): Promise<void> {
    try {
      const assetId = req.query.assetId as string;
      const employeeId = req.query.employeeId as string;
      const assignmentType = req.query.assignmentType as 'employee' | 'room';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const report = await ReportService.getAssignmentReport({
        assetId,
        employeeId,
        assignmentType,
        limit,
      });

      res.status(200).json(successResponse('Assignment report generated successfully', report));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to generate assignment report';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get maintenance report
   * GET /api/v1/reports/maintenance
   */
  async getMaintenanceReport(req: Request, res: Response): Promise<void> {
    try {
      const statusId = req.query.statusId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const report = await ReportService.getMaintenanceReport({
        statusId,
        startDate,
        endDate,
        limit,
      });

      res.status(200).json(successResponse('Maintenance report generated successfully', report));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to generate maintenance report';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get warranty report
   * GET /api/v1/reports/warranty
   */
  async getWarrantyReport(req: Request, res: Response): Promise<void> {
    try {
      const statusId = req.query.statusId as string;
      const expiringWithinDays = req.query.expiringWithinDays
        ? parseInt(req.query.expiringWithinDays as string)
        : 90;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const report = await ReportService.getWarrantyReport({
        statusId,
        expiringWithinDays,
        limit,
      });

      res.status(200).json(successResponse('Warranty report generated successfully', report));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to generate warranty report';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get depreciation report
   * GET /api/v1/reports/depreciation
   */
  async getDepreciationReport(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const report = await ReportService.getDepreciationReport({
        categoryId,
        limit,
      });

      res.status(200).json(successResponse('Depreciation report generated successfully', report));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to generate depreciation report';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },
};
