import { AssetImportJob, IAssetImportJob } from './asset-import-job.model';
import { Asset } from '../assets/asset.model';
import { AssetCategory } from '../asset-categories/asset-category.model';
import { AssetStatus } from '../asset-statuses/asset-status.model';
import { Vendor } from '../vendors/vendor.model';
import { Location } from '../locations/location.model';
import { Room } from '../rooms/room.model';

export interface ImportPreviewData {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{ row: number; message: string }>;
  preview: Array<Record<string, any>>;
  columnMapping: Record<string, string>;
}

export class ImportService {
  private static readonly REQUIRED_FIELDS = ['assetTag', 'name', 'categoryId', 'statusId'];
  private static readonly VALID_FIELDS = [
    'assetTag',
    'name',
    'serialNumber',
    'deviceModel',
    'categoryId',
    'statusId',
    'vendorId',
    'purchaseDate',
    'warrantyDate',
    'cost',
    'locationId',
    'roomId',
    'description',
    'barcodeData',
    'qrCodeData',
  ];

  /**
   * Parse CSV content
   */
  static parseCSV(fileContent: string): Array<Record<string, string>> {
    const lines = fileContent.trim().split('\n');
    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    return rows;
  }

  /**
   * Create import preview
   */
  static async createImportPreview(
    fileName: string,
    fileType: string,
    fileContent: string,
    columnMapping: Record<string, string>,
    userId: string
  ): Promise<{ job: IAssetImportJob; preview: ImportPreviewData }> {
    // Parse file
    let rawRows: Array<Record<string, string>> = [];
    if (fileType === 'CSV') {
      rawRows = this.parseCSV(fileContent);
    } else {
      const error = new Error('File type not yet supported') as any;
      error.statusCode = 400;
      error.errors = ['Only CSV format is currently supported. XLS/XLSX support coming soon.'];
      throw error;
    }

    if (rawRows.length === 0) {
      const error = new Error('Empty file') as any;
      error.statusCode = 400;
      error.errors = ['File contains no data rows'];
      throw error;
    }

    // Map columns and validate
    const { validRows, invalidRows, errors, preview } = await this.validateAndMapRows(
      rawRows,
      columnMapping
    );

    // Create import job with preview
    const job = new AssetImportJob({
      fileName,
      fileType: fileType.toUpperCase(),
      status: 'PREVIEW',
      totalRows: rawRows.length,
      validRows,
      invalidRows,
      columnMapping,
      preview: preview.slice(0, 10), // Store first 10 rows for preview
      importErrors: errors,
      createdBy: userId,
    });

    await job.save();

    return {
      job,
      preview: {
        totalRows: rawRows.length,
        validRows,
        invalidRows,
        errors,
        preview,
        columnMapping,
      },
    };
  }

  /**
   * Validate and map CSV rows to asset fields
   */
  private static async validateAndMapRows(
    rawRows: Array<Record<string, string>>,
    columnMapping: Record<string, string>
  ): Promise<{
    validRows: number;
    invalidRows: number;
    errors: Array<{ row: number; message: string }>;
    preview: Array<Record<string, any>>;
  }> {
    const errors: Array<{ row: number; message: string }> = [];
    const preview: Array<Record<string, any>> = [];
    let validCount = 0;
    let invalidCount = 0;

    // Validate column mapping
    for (const csvCol of Object.keys(columnMapping)) {
      if (!this.VALID_FIELDS.includes(columnMapping[csvCol])) {
        errors.push({ row: 0, message: `Invalid field mapping: ${columnMapping[csvCol]}` });
      }
    }

    // Load referenced data for validation
    const categories = await AssetCategory.find({ isDeleted: false });
    const statuses = await AssetStatus.find({ isDeleted: false });
    const vendors = await Vendor.find({ isDeleted: false });
    const locations = await Location.find({ isDeleted: false });
    const rooms = await Room.find({ isDeleted: false });

    const categoryMap = Object.fromEntries(categories.map(c => [c.name.toLowerCase(), c._id.toString()]));
    const statusMap = Object.fromEntries(statuses.map(s => [s.name.toLowerCase(), s._id.toString()]));
    const vendorMap = Object.fromEntries(vendors.map(v => [v.name.toLowerCase(), v._id.toString()]));
    const locationMap = Object.fromEntries(locations.map(l => [l.name.toLowerCase(), l._id.toString()]));
    const roomMap = Object.fromEntries(rooms.map(r => [r.name.toLowerCase(), r._id.toString()]));

    for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex++) {
      const rawRow = rawRows[rowIndex];
      const mappedRow: Record<string, any> = {};
      const rowErrors: string[] = [];

      // Apply column mapping
      for (const csvCol of Object.keys(columnMapping)) {
        const assetField = columnMapping[csvCol];
        const value = rawRow[csvCol];
        if (value) {
          mappedRow[assetField] = value;
        }
      }

      // Validate required fields
      for (const requiredField of this.REQUIRED_FIELDS) {
        if (!mappedRow[requiredField]) {
          rowErrors.push(`Missing required field: ${requiredField}`);
        }
      }

      // Validate referenced IDs (convert names to IDs if needed)
      if (mappedRow.categoryId) {
        const catId = categoryMap[mappedRow.categoryId.toLowerCase()] || mappedRow.categoryId;
        if (!categories.some(c => c._id.toString() === catId || c.name === mappedRow.categoryId)) {
          rowErrors.push(`Invalid category: ${mappedRow.categoryId}`);
        } else {
          mappedRow.categoryId = catId;
        }
      }

      if (mappedRow.statusId) {
        const statId = statusMap[mappedRow.statusId.toLowerCase()] || mappedRow.statusId;
        if (!statuses.some(s => s._id.toString() === statId || s.name === mappedRow.statusId)) {
          rowErrors.push(`Invalid status: ${mappedRow.statusId}`);
        } else {
          mappedRow.statusId = statId;
        }
      }

      if (mappedRow.vendorId) {
        const vendId = vendorMap[mappedRow.vendorId.toLowerCase()] || mappedRow.vendorId;
        if (!vendors.some(v => v._id.toString() === vendId || v.name === mappedRow.vendorId)) {
          rowErrors.push(`Invalid vendor: ${mappedRow.vendorId}`);
        } else {
          mappedRow.vendorId = vendId;
        }
      }

      if (mappedRow.locationId) {
        const locId = locationMap[mappedRow.locationId.toLowerCase()] || mappedRow.locationId;
        if (!locations.some(l => l._id.toString() === locId || l.name === mappedRow.locationId)) {
          rowErrors.push(`Invalid location: ${mappedRow.locationId}`);
        } else {
          mappedRow.locationId = locId;
        }
      }

      if (mappedRow.roomId) {
        const roomId = roomMap[mappedRow.roomId.toLowerCase()] || mappedRow.roomId;
        if (!rooms.some(r => r._id.toString() === roomId || r.name === mappedRow.roomId)) {
          rowErrors.push(`Invalid room: ${mappedRow.roomId}`);
        } else {
          mappedRow.roomId = roomId;
        }
      }

      // Check for duplicate asset tags
      const existingAsset = await Asset.findOne({
        assetTag: mappedRow.assetTag,
        isDeleted: false,
      });
      if (existingAsset) {
        rowErrors.push(`Duplicate asset tag: ${mappedRow.assetTag}`);
      }

      if (rowErrors.length > 0) {
        invalidCount++;
        errors.push({ row: rowIndex + 1, message: rowErrors.join('; ') });
      } else {
        validCount++;
        preview.push({ ...mappedRow, _rowIndex: rowIndex });
      }
    }

    return { validRows: validCount, invalidRows: invalidCount, errors, preview };
  }

  /**
   * Commit import - create assets from preview data
   */
  static async commitImport(jobId: string): Promise<{ created: number; failed: number; errors: string[] }> {
    const job = await AssetImportJob.findById(jobId);
    if (!job || job.isDeleted) {
      const error = new Error('Import job not found') as any;
      error.statusCode = 404;
      error.errors = ['Referenced import job does not exist'];
      throw error;
    }

    if (job.status !== 'PREVIEW') {
      const error = new Error('Invalid job status') as any;
      error.statusCode = 400;
      error.errors = ['Can only commit jobs in PREVIEW status'];
      throw error;
    }

    job.status = 'PROCESSING';
    await job.save();

    let created = 0;
    let failed = 0;
    const failedAssets: string[] = [];
    const importedAssets: string[] = [];

    if (job.preview && job.preview.length > 0) {
      for (const assetData of job.preview) {
        try {
          // Remove internal row index field
          const { _rowIndex, ...cleanData } = assetData;

          const asset = new Asset(cleanData);
          const savedAsset = await asset.save();
          created++;
          importedAssets.push(savedAsset._id.toString());
        } catch (error: any) {
          failed++;
          failedAssets.push(`${assetData.assetTag}: ${error.message}`);
        }
      }
    }

    job.status = 'COMPLETED';
    job.importedRows = created;
    job.failedRows = failed;
    job.importedAssets = importedAssets;
    job.completedAt = new Date();
    await job.save();

    return {
      created,
      failed,
      errors: failedAssets,
    };
  }

  /**
   * Get import job by ID
   */
  static async getImportJobById(id: string): Promise<IAssetImportJob | null> {
    return await AssetImportJob.findById(id).exec();
  }

  /**
   * List import jobs
   */
  static async listImportJobs(
    page: number = 1,
    limit: number = 10,
    userId?: string
  ): Promise<{ jobs: IAssetImportJob[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    if (userId) {
      query.createdBy = userId;
    }

    const [jobs, total] = await Promise.all([
      AssetImportJob.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      AssetImportJob.countDocuments(query),
    ]);

    return {
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get column suggestions based on file headers
   */
  static suggestColumnMapping(fileContent: string, fileType: string): Record<string, string> {
    const mapping: Record<string, string> = {};
    let headers: string[] = [];

    if (fileType === 'CSV') {
      const firstLine = fileContent.split('\n')[0];
      headers = firstLine.split(',').map(h => h.trim());
    }

    // Auto-suggest mappings based on header names
    for (const header of headers) {
      const lowerHeader = header.toLowerCase();

      if (lowerHeader.includes('asset') && lowerHeader.includes('tag')) {
        mapping[header] = 'assetTag';
      } else if (lowerHeader === 'name' || lowerHeader.includes('asset name')) {
        mapping[header] = 'name';
      } else if (lowerHeader.includes('serial')) {
        mapping[header] = 'serialNumber';
      } else if (lowerHeader.includes('model')) {
        mapping[header] = 'deviceModel';
      } else if (lowerHeader.includes('category')) {
        mapping[header] = 'categoryId';
      } else if (lowerHeader.includes('status')) {
        mapping[header] = 'statusId';
      } else if (lowerHeader.includes('vendor')) {
        mapping[header] = 'vendorId';
      } else if (lowerHeader.includes('purchase')) {
        mapping[header] = 'purchaseDate';
      } else if (lowerHeader.includes('warranty')) {
        mapping[header] = 'warrantyDate';
      } else if (lowerHeader.includes('cost') || lowerHeader.includes('price')) {
        mapping[header] = 'cost';
      } else if (lowerHeader.includes('location')) {
        mapping[header] = 'locationId';
      } else if (lowerHeader.includes('room')) {
        mapping[header] = 'roomId';
      } else if (lowerHeader.includes('description')) {
        mapping[header] = 'description';
      }
    }

    return mapping;
  }
}
