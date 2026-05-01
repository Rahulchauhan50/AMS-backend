import { Request, Response } from 'express';
import { ImportService } from './import.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';
import { AuditLogService } from '../audit-logs/audit-log.service';

export const ImportController = {
  /**
   * Get column suggestions for file headers
   * POST /api/v1/imports/suggest-columns
   */
  async suggestColumns(req: Request, res: Response): Promise<void> {
    try {
      const { fileContent, fileType } = req.body;

      if (!fileContent || !fileType) {
        res.status(400).json(
          errorResponse('Missing required fields', ['fileContent and fileType are required'])
        );
        return;
      }

      const suggestions = ImportService.suggestColumnMapping(fileContent, fileType);

      res.status(200).json(successResponse('Column suggestions retrieved successfully', suggestions));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to suggest columns';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Create import preview
   * POST /api/v1/imports/assets/preview
   */
  async createImportPreview(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, fileType, fileContent, columnMapping } = req.body;
      const userId = res.locals.userId;

      // Validation
      if (!fileName || !fileType || !fileContent || !columnMapping) {
        res.status(400).json(
          errorResponse('Missing required fields', [
            'fileName, fileType, fileContent, and columnMapping are required',
          ])
        );
        return;
      }

      const { job, preview } = await ImportService.createImportPreview(
        fileName,
        fileType,
        fileContent,
        columnMapping,
        userId
      );

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: {
          action: 'create_import_preview',
          fileName,
          fileType,
          totalRows: preview.totalRows,
        },
      });

      res.status(200).json(successResponse('Import preview created successfully', { job, preview }));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to create import preview';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Commit import
   * POST /api/v1/imports/assets/commit
   */
  async commitImport(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.body;

      if (!jobId) {
        res.status(400).json(errorResponse('Missing required fields', ['jobId is required']));
        return;
      }

      const result = await ImportService.commitImport(jobId);

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: {
          action: 'commit_import',
          jobId,
          created: result.created,
          failed: result.failed,
        },
      });

      res.status(200).json(
        successResponse('Import committed successfully', {
          jobId,
          created: result.created,
          failed: result.failed,
          errors: result.errors,
        })
      );
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to commit import';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get import job by ID
   * GET /api/v1/imports/:id
   */
  async getImportJobById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      const job = await ImportService.getImportJobById(id);

      if (!job || job.isDeleted) {
        res.status(404).json(errorResponse('Import job not found', []));
        return;
      }

      res.status(200).json(successResponse('Import job retrieved successfully', job));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve import job';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * List import jobs
   * GET /api/v1/imports
   */
  async listImportJobs(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const userId = req.query.userId as string;

      const result = await ImportService.listImportJobs(page, limit, userId);

      res.status(200).json(successResponse('Import jobs retrieved successfully', result));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve import jobs';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },
};
