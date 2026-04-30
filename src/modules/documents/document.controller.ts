import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import DocumentService from './document.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class DocumentController {
  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileType, description, relatedAssetId, relatedVendorId, relatedContractId, relatedMaintenanceId } = req.body;

      if (!fileType || typeof fileType !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('fileType', 'File type is required')));
      }

      const validFileTypes = ['INVOICE', 'WARRANTY', 'MANUAL', 'CONTRACT', 'MAINTENANCE_RECORD', 'OTHER'];
      if (!validFileTypes.includes(fileType)) {
        return res
          .status(400)
          .json(errorResponse('Validation failed', validationError('fileType', `File type must be one of: ${validFileTypes.join(', ')}`)));
      }

      // Get file from request (assuming multer middleware)
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json(errorResponse('Validation failed', validationError('file', 'File is required')));
      }

      const uploadedBy = String((res.locals as any).user?.id || '');
      const document = await DocumentService.uploadDocument(
        {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          buffer: file.buffer,
        },
        fileType as any,
        description ? String(description) : undefined,
        uploadedBy,
        relatedAssetId ? String(relatedAssetId) : undefined,
        relatedVendorId ? String(relatedVendorId) : undefined,
        relatedContractId ? String(relatedContractId) : undefined,
        relatedMaintenanceId ? String(relatedMaintenanceId) : undefined
      );

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { fileName: document.fileName, fileType: document.fileType, relatedAssetId },
      });

      return res.status(201).json(successResponse('Document uploaded successfully', document));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Related entity not found'));
      }

      next(error);
    }
  }

  static async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const relatedAssetId = req.query.relatedAssetId as string | undefined;
      const relatedVendorId = req.query.relatedVendorId as string | undefined;
      const fileType = req.query.fileType as string | undefined;
      const uploadedBy = req.query.uploadedBy as string | undefined;

      const result = await DocumentService.listDocuments(
        { relatedAssetId, relatedVendorId, fileType: fileType as any, uploadedBy },
        page,
        limit
      );

      return res.status(200).json(
        successResponse('Documents retrieved successfully', result.documents, {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await DocumentService.getDocument(String(req.params.id));
      return res.status(200).json(successResponse('Document retrieved successfully', document));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Document not found'));
      }

      next(error);
    }
  }

  static async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await DocumentService.getDocument(String(req.params.id));
      const fileBuffer = await DocumentService.getDocumentFile(String(req.params.id));

      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      return res.send(fileBuffer);
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Document not found'));
      }

      next(error);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await DocumentService.deleteDocument(String(req.params.id));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'document_deleted', fileName: document.fileName },
      });

      return res.status(200).json(successResponse('Document deleted successfully', document));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Document not found'));
      }

      next(error);
    }
  }

  static async getAssetDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const fileType = req.query.fileType as string | undefined;

      const result = await DocumentService.getAssetDocuments(String(req.params.assetId), fileType as any, page, limit);

      return res.status(200).json(
        successResponse('Asset documents retrieved successfully', result.documents, {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        })
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async attachDocumentToAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.body;

      if (!documentId) {
        return res.status(400).json(errorResponse('Validation failed', validationError('documentId', 'Document ID is required')));
      }

      const document = await DocumentService.attachDocumentToAsset(String(documentId), String(req.params.assetId));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'document_attached', documentId, assetId: req.params.assetId },
      });

      return res.status(200).json(successResponse('Document attached to asset successfully', document));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset or document not found'));
      }

      next(error);
    }
  }
}

export default DocumentController;
