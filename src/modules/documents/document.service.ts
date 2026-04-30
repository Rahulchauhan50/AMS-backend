import { Document, type IDocument } from './document.model';
import FileStorageService, { type FileUpload } from './file-storage.service';
import { Asset } from '../assets/asset.model';
import { Vendor } from '../vendors/vendor.model';

export type DocumentFileType = 'INVOICE' | 'WARRANTY' | 'MANUAL' | 'CONTRACT' | 'MAINTENANCE_RECORD' | 'OTHER';

export class DocumentService {
  static async uploadDocument(
    file: FileUpload,
    fileType: DocumentFileType,
    description?: string,
    uploadedBy?: string,
    relatedAssetId?: string,
    relatedVendorId?: string,
    relatedContractId?: string,
    relatedMaintenanceId?: string
  ) {
    // Validate file
    const validation = FileStorageService.validateFileUpload(file);
    if (!validation.valid) {
      const error = new Error(validation.error || 'File validation failed');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'file', message: validation.error }];
      throw error;
    }

    // Validate at least one related entity
    if (!relatedAssetId && !relatedVendorId && !relatedContractId && !relatedMaintenanceId) {
      const error = new Error('At least one related entity is required');
      (error as any).statusCode = 400;
      (error as any).errors = [
        { field: 'relatedEntity', message: 'Document must be linked to asset, vendor, contract, or maintenance record' },
      ];
      throw error;
    }

    // Validate related entities exist
    if (relatedAssetId) {
      const asset = await Asset.findOne({ _id: relatedAssetId, isDeleted: false });
      if (!asset) {
        const error = new Error('Related asset not found');
        (error as any).statusCode = 404;
        (error as any).errors = [{ field: 'relatedAssetId', message: 'Asset does not exist' }];
        throw error;
      }
    }

    if (relatedVendorId) {
      const vendor = await Vendor.findOne({ _id: relatedVendorId, isDeleted: false });
      if (!vendor) {
        const error = new Error('Related vendor not found');
        (error as any).statusCode = 404;
        (error as any).errors = [{ field: 'relatedVendorId', message: 'Vendor does not exist' }];
        throw error;
      }
    }

    // Save file to disk
    const { filePath, fileSize } = await FileStorageService.saveFile(file);

    // Create document record in database
    const document = await Document.create({
      fileName: file.originalName,
      fileType,
      mimeType: file.mimeType,
      fileSize,
      filePath,
      description: description || '',
      uploadedBy: uploadedBy || '',
      relatedAssetId: relatedAssetId || '',
      relatedVendorId: relatedVendorId || '',
      relatedContractId: relatedContractId || '',
      relatedMaintenanceId: relatedMaintenanceId || '',
    });

    return document;
  }

  static async getDocument(id: string) {
    const document = await Document.findOne({ _id: id, isDeleted: false });
    if (!document) {
      const error = new Error('Document not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'id', message: 'Document does not exist' }];
      throw error;
    }
    return document;
  }

  static async listDocuments(
    filters?: {
      relatedAssetId?: string;
      relatedVendorId?: string;
      fileType?: DocumentFileType;
      uploadedBy?: string;
    },
    page: number = 1,
    limit: number = 20
  ) {
    const query: any = { isDeleted: false };

    if (filters?.relatedAssetId) {
      query.relatedAssetId = filters.relatedAssetId;
    }
    if (filters?.relatedVendorId) {
      query.relatedVendorId = filters.relatedVendorId;
    }
    if (filters?.fileType) {
      query.fileType = filters.fileType;
    }
    if (filters?.uploadedBy) {
      query.uploadedBy = filters.uploadedBy;
    }

    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Document.countDocuments(query);

    return {
      documents,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async deleteDocument(id: string) {
    const document = await this.getDocument(id);

    // Delete file from disk
    await FileStorageService.deleteFile(document.filePath);

    // Soft delete from database
    document.isDeleted = true;
    await document.save();

    return document;
  }

  static async getAssetDocuments(assetId: string, fileType?: DocumentFileType, page: number = 1, limit: number = 20) {
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    return this.listDocuments({ relatedAssetId: assetId, fileType }, page, limit);
  }

  static async attachDocumentToAsset(documentId: string, assetId: string) {
    const document = await this.getDocument(documentId);
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });

    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    // Update document with asset reference
    if (!document.relatedAssetId) {
      document.relatedAssetId = assetId;
      await document.save();
    }

    return document;
  }

  static async getDocumentFile(id: string): Promise<Buffer> {
    const document = await this.getDocument(id);
    return FileStorageService.getFileBuffer(document.filePath);
  }
}

export default DocumentService;
