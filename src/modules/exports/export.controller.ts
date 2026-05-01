import { Request, Response } from 'express';
import { ExportService } from './export.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';
import { AuditLogService } from '../audit-logs/audit-log.service';

export const ExportController = {
  /**
   * Export assets to CSV
   * GET /api/v1/exports/assets.csv
   */
  async exportAssetsCSV(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string;
      const statusId = req.query.statusId as string;
      const locationId = req.query.locationId as string;
      const roomId = req.query.roomId as string;
      const vendorId = req.query.vendorId as string;

      const csvContent = await ExportService.exportAssetsToCSV({
        categoryId,
        statusId,
        locationId,
        roomId,
        vendorId,
      });

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: {
          action: 'export_assets_csv',
          filters: { categoryId, statusId, locationId, roomId, vendorId },
        },
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="assets.csv"');
      res.send(csvContent);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to export assets to CSV';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Export assets to XLSX
   * GET /api/v1/exports/assets.xlsx
   */
  async exportAssetsXLSX(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string;
      const statusId = req.query.statusId as string;
      const locationId = req.query.locationId as string;
      const roomId = req.query.roomId as string;
      const vendorId = req.query.vendorId as string;

      const buffer = await ExportService.exportAssetsToXLSX({
        categoryId,
        statusId,
        locationId,
        roomId,
        vendorId,
      });

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: {
          action: 'export_assets_xlsx',
          filters: { categoryId, statusId, locationId, roomId, vendorId },
        },
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="assets.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to export assets to XLSX';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Export assets to PDF
   * GET /api/v1/exports/assets.pdf
   */
  async exportAssetsPDF(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string;
      const statusId = req.query.statusId as string;
      const locationId = req.query.locationId as string;
      const roomId = req.query.roomId as string;
      const vendorId = req.query.vendorId as string;

      const buffer = await ExportService.exportAssetsToPDF({
        categoryId,
        statusId,
        locationId,
        roomId,
        vendorId,
      });

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: {
          action: 'export_assets_pdf',
          filters: { categoryId, statusId, locationId, roomId, vendorId },
        },
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="assets.pdf"');
      res.send(buffer);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to export assets to PDF';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Export audit logs to CSV
   * GET /api/v1/exports/audit-logs
   */
  async exportAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const module_filter = req.query.module as string;
      const action = req.query.action as string;
      const userId = req.query.userId as string;

      const csvContent = await ExportService.exportAuditLogsToCSV({
        module: module_filter,
        action,
        userId,
      });

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: {
          action: 'export_audit_logs',
          filters: { module: module_filter, action, userId },
        },
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      res.send(csvContent);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to export audit logs';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get asset value summary report
   * GET /api/v1/exports/reports/asset-value-summary
   */
  async getAssetValueSummary(req: Request, res: Response): Promise<void> {
    try {
      const report = await ExportService.generateAssetValueReport();

      res.status(200).json(successResponse('Asset value summary report generated', report));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to generate asset value summary report';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },
};
