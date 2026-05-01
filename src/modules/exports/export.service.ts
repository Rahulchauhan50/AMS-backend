import { Asset } from '../assets/asset.model';
import { AuditLog } from '../audit-logs/audit-log.model';

export class ExportService {
  /**
   * Export assets to CSV
   */
  static async exportAssetsToCSV(filters?: {
    categoryId?: string;
    statusId?: string;
    locationId?: string;
    roomId?: string;
    vendorId?: string;
  }): Promise<string> {
    const query: any = { isDeleted: false };

    if (filters?.categoryId) query.categoryId = filters.categoryId;
    if (filters?.statusId) query.statusId = filters.statusId;
    if (filters?.locationId) query.locationId = filters.locationId;
    if (filters?.roomId) query.roomId = filters.roomId;
    if (filters?.vendorId) query.vendorId = filters.vendorId;

    const assets = await Asset.find(query)
      .select([
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
        'createdAt',
        'updatedAt',
      ])
      .lean()
      .exec();

    if (assets.length === 0) {
      return 'assetTag,name,serialNumber,deviceModel,categoryId,statusId,vendorId,purchaseDate,warrantyDate,cost,locationId,roomId,description,createdAt,updatedAt';
    }

    try {
      // Manual CSV generation
      const headers = [
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
        'createdAt',
        'updatedAt',
      ];

      let csv = headers.join(',') + '\n';

      for (const asset of assets) {
        const row = [
          this.escapeCSVField(asset.assetTag),
          this.escapeCSVField(asset.name),
          this.escapeCSVField(asset.serialNumber),
          this.escapeCSVField(asset.deviceModel),
          this.escapeCSVField(asset.categoryId?.toString()),
          this.escapeCSVField(asset.statusId?.toString()),
          this.escapeCSVField(asset.vendorId?.toString()),
          this.escapeCSVField(asset.purchaseDate?.toString()),
          this.escapeCSVField(asset.warrantyDate?.toString()),
          asset.cost?.toString() || '',
          this.escapeCSVField(asset.locationId?.toString()),
          this.escapeCSVField(asset.roomId?.toString()),
          this.escapeCSVField(asset.description),
          asset.createdAt?.toString() || '',
          asset.updatedAt?.toString() || '',
        ];
        csv += row.join(',') + '\n';
      }

      return csv;
    } catch (error: any) {
      const err = new Error('Failed to generate CSV') as any;
      err.statusCode = 500;
      err.errors = [error.message];
      throw err;
    }
  }

  /**
   * Export assets to XLSX (requires external service or library)
   */
  static async exportAssetsToXLSX(filters?: {
    categoryId?: string;
    statusId?: string;
    locationId?: string;
    roomId?: string;
    vendorId?: string;
  }): Promise<Buffer> {
    const query: any = { isDeleted: false };

    if (filters?.categoryId) query.categoryId = filters.categoryId;
    if (filters?.statusId) query.statusId = filters.statusId;
    if (filters?.locationId) query.locationId = filters.locationId;
    if (filters?.roomId) query.roomId = filters.roomId;
    if (filters?.vendorId) query.vendorId = filters.vendorId;

    const assets = await Asset.find(query)
      .select([
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
        'createdAt',
        'updatedAt',
      ])
      .lean()
      .exec();

    try {
      const XLSX = require('xlsx');

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(assets);

      // Set column widths
      const columnWidths = [
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      return buffer;
    } catch (error: any) {
      const err = new Error('Failed to generate XLSX') as any;
      err.statusCode = 500;
      err.errors = [error.message];
      throw err;
    }
  }

  /**
   * Export assets to PDF
   */
  static async exportAssetsToPDF(filters?: {
    categoryId?: string;
    statusId?: string;
    locationId?: string;
    roomId?: string;
    vendorId?: string;
  }): Promise<Buffer> {
    const query: any = { isDeleted: false };

    if (filters?.categoryId) query.categoryId = filters.categoryId;
    if (filters?.statusId) query.statusId = filters.statusId;
    if (filters?.locationId) query.locationId = filters.locationId;
    if (filters?.roomId) query.roomId = filters.roomId;
    if (filters?.vendorId) query.vendorId = filters.vendorId;

    const assets = await Asset.find(query)
      .select([
        'assetTag',
        'name',
        'serialNumber',
        'cost',
        'purchaseDate',
        'warrantyDate',
        'description',
      ])
      .lean()
      .exec();

    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ bufferPages: true });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      // Title
      doc.fontSize(16).text('Asset Export Report', { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();

      // Table header
      const pageWidth = doc.page.width - 40;
      const colWidth = pageWidth / 4;

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Asset Tag', 20, doc.y, { width: colWidth, ellipsis: true })
        .text('Name', 20 + colWidth, doc.y - 12, { width: colWidth, ellipsis: true })
        .text('Serial Number', 20 + colWidth * 2, doc.y - 12, { width: colWidth, ellipsis: true })
        .text('Cost', 20 + colWidth * 3, doc.y - 12, { width: colWidth, ellipsis: true });

      doc.moveTo(20, doc.y).lineTo(pageWidth + 20, doc.y).stroke();
      doc.moveDown();

      // Table rows
      doc.font('Helvetica').fontSize(8);
      for (const asset of assets) {
        const y = doc.y;
        doc
          .text(asset.assetTag || '', 20, y, { width: colWidth, ellipsis: true })
          .text(asset.name || '', 20 + colWidth, y, { width: colWidth, ellipsis: true })
          .text(asset.serialNumber || '', 20 + colWidth * 2, y, { width: colWidth, ellipsis: true })
          .text(asset.cost?.toString() || '', 20 + colWidth * 3, y, { width: colWidth, ellipsis: true });
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', reject);
      });
    } catch (error: any) {
      const err = new Error('Failed to generate PDF') as any;
      err.statusCode = 500;
      err.errors = [error.message];
      throw err;
    }
  }

  /**
   * Export audit logs to CSV
   */
  static async exportAuditLogsToCSV(filters?: {
    module?: string;
    action?: string;
    userId?: string;
  }): Promise<string> {
    const query: any = { isDeleted: false };

    if (filters?.module) query.module = filters.module;
    if (filters?.action) query.action = filters.action;
    if (filters?.userId) query.userId = filters.userId;

    const logs = await AuditLog.find(query)
      .select(['module', 'action', 'entity', 'entityId', 'userId', 'changes', 'createdAt'])
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean()
      .exec();

    if (logs.length === 0) {
      return 'module,action,entity,entityId,actorName,actorEmail,oldValue,newValue,createdAt';
    }

    try {
      // Manual CSV generation
      const headers = ['module', 'action', 'entity', 'entityId', 'actorName', 'actorEmail', 'oldValue', 'newValue', 'createdAt'];
      let csv = headers.join(',') + '\n';

      for (const log of logs) {
        const row = [
          this.escapeCSVField(log.module),
          this.escapeCSVField(log.action),
          this.escapeCSVField(log.entity),
          this.escapeCSVField(log.entityId),
          this.escapeCSVField(log.actorName),
          this.escapeCSVField(log.actorEmail),
          this.escapeCSVField(JSON.stringify(log.oldValue)),
          this.escapeCSVField(JSON.stringify(log.newValue)),
          log.createdAt?.toString() || '',
        ];
        csv += row.join(',') + '\n';
      }

      return csv;
    } catch (error: any) {
      const err = new Error('Failed to generate CSV') as any;
      err.statusCode = 500;
      err.errors = [error.message];
      throw err;
    }
  }

  /**
   * Generate asset value summary report
   */
  static async generateAssetValueReport(): Promise<Record<string, any>> {
    const assets = await Asset.find({ isDeleted: false }).lean().exec();

    const totalAssets = assets.length;
    const totalValue = assets.reduce((sum, a) => sum + (a.cost || 0), 0);
    const averageValue = totalAssets > 0 ? totalValue / totalAssets : 0;

    // Group by status
    const statusGroups: Record<string, any> = {};
    assets.forEach(a => {
      if (!statusGroups[a.statusId]) {
        statusGroups[a.statusId] = { count: 0, value: 0 };
      }
      statusGroups[a.statusId].count++;
      statusGroups[a.statusId].value += a.cost || 0;
    });

    // Group by category
    const categoryGroups: Record<string, any> = {};
    assets.forEach(a => {
      if (!categoryGroups[a.categoryId]) {
        categoryGroups[a.categoryId] = { count: 0, value: 0 };
      }
      categoryGroups[a.categoryId].count++;
      categoryGroups[a.categoryId].value += a.cost || 0;
    });

    return {
      summary: {
        totalAssets,
        totalValue,
        averageValue,
      },
      byStatus: statusGroups,
      byCategory: categoryGroups,
      generatedAt: new Date(),
    };
  }

  /**
   * Escape CSV field values
   */
  private static escapeCSVField(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = value.toString();

    // If the field contains comma, newline, or quote, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}
