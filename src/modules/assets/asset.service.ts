import { Asset, type IAsset } from './asset.model';
import { AssetCategory } from '../asset-categories/asset-category.model';
import { AssetStatus } from '../asset-statuses/asset-status.model';
import { Vendor } from '../vendors/vendor.model';
import { Location } from '../locations/location.model';
import { Room } from '../rooms/room.model';
import { Assignment } from '../assignments/assignment.model';
import { AuditLog } from '../audit-logs/audit-log.model';
import { AssetCategoryCode } from '../../common/enums';
import { AssetMovement } from './asset-movement.model';
import { AssetTimelineEventType } from '../../common/enums';

interface AssetInput {
  assetTag: string;
  name: string;
  serialNumber?: string;
  deviceModel?: string;
  categoryId: string;
  statusId: string;
  vendorId?: string;
  purchaseDate?: Date;
  warrantyDate?: Date;
  cost?: number;
  salvageValue?: number;
  usefulLifeYears?: number;
  depreciationMethod?: string;
  depreciationStartDate?: Date;
  accumulatedDepreciation?: number;
  currentBookValue?: number;
  locationId?: string;
  roomId?: string;
  description?: string;
}

const normalizeText = (value: string) => value.trim();

export class AssetService {
  static async generateAssetTag(categoryId: string): Promise<string> {
    const category = await AssetCategory.findOne({ _id: categoryId, isDeleted: false });
    if (!category) {
      const error = new Error('Asset category does not exist');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'categoryId', message: 'Category not found' }];
      throw error;
    }

    const prefix = category.prefix;

    // Find the highest numbered asset with this prefix that is not deleted
    const lastAsset = await Asset.findOne(
      { assetTag: { $regex: `^${prefix}-`, $options: 'i' }, isDeleted: false },
      { assetTag: 1 },
      { sort: { createdAt: -1 } }
    );

    let nextNumber = 1;
    if (lastAsset) {
      const match = lastAsset.assetTag.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format as PREFIX-000001
    const paddedNumber = String(nextNumber).padStart(6, '0');
    return `${prefix}-${paddedNumber}`;
  }

  static generateBarcodeData(assetId: string, assetTag: string): string {
    // Generate barcode data as JSON string containing asset identifier
    return JSON.stringify({
      assetId,
      assetTag,
      type: 'barcode',
      timestamp: new Date().toISOString(),
    });
  }

  static generateQRCodeData(assetId: string, assetTag: string): string {
    // Generate QR code data as JSON string with asset information
    return JSON.stringify({
      assetId,
      assetTag,
      type: 'qr',
      timestamp: new Date().toISOString(),
    });
  }
  static async validateReferences(input: AssetInput) {
    const errors = [];

    const category = await AssetCategory.findOne({ _id: input.categoryId, isDeleted: false });
    if (!category) {
      errors.push({ field: 'categoryId', message: 'Asset category does not exist' });
    }

    const status = await AssetStatus.findOne({ _id: input.statusId, isDeleted: false });
    if (!status) {
      errors.push({ field: 'statusId', message: 'Asset status does not exist' });
    }

    if (input.vendorId) {
      const vendor = await Vendor.findOne({ _id: input.vendorId, isDeleted: false });
      if (!vendor) {
        errors.push({ field: 'vendorId', message: 'Vendor does not exist' });
      }
    }

    if (input.locationId) {
      const location = await Location.findOne({ _id: input.locationId, isDeleted: false });
      if (!location) {
        errors.push({ field: 'locationId', message: 'Location does not exist' });
      }
    }

    if (input.roomId) {
      const room = await Room.findOne({ _id: input.roomId, isDeleted: false });
      if (!room) {
        errors.push({ field: 'roomId', message: 'Room does not exist' });
      }
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed');
      (error as any).statusCode = 400;
      (error as any).errors = errors;
      throw error;
    }
  }

  static async findDuplicate(assetTag: string, serialNumber?: string, excludeId?: string) {
    const conditions: any[] = [];

    conditions.push({ assetTag: normalizeText(assetTag), isDeleted: false });

    if (serialNumber) {
      conditions.push({ serialNumber: normalizeText(serialNumber), isDeleted: false });
    }

    const query: any = { $or: conditions };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return Asset.findOne(query);
  }

  static async createAsset(input: AssetInput) {
    await this.validateReferences(input);

    const duplicate = await this.findDuplicate(input.assetTag, input.serialNumber);
    if (duplicate) {
      const errors = [];
      if (duplicate.assetTag === normalizeText(input.assetTag)) {
        errors.push({ field: 'assetTag', message: 'Asset tag already exists' });
      }
      if (input.serialNumber && duplicate.serialNumber === normalizeText(input.serialNumber)) {
        errors.push({ field: 'serialNumber', message: 'Serial number already exists' });
      }

      const error = new Error('Duplicate asset information');
      (error as any).statusCode = 409;
      (error as any).errors = errors;
      throw error;
    }

    const asset = await Asset.create({
      assetTag: normalizeText(input.assetTag),
      name: normalizeText(input.name),
      serialNumber: input.serialNumber ? normalizeText(input.serialNumber) : '',
      deviceModel: input.deviceModel?.trim() || '',
      categoryId: input.categoryId,
      statusId: input.statusId,
      vendorId: input.vendorId || '',
      purchaseDate: input.purchaseDate,
      warrantyDate: input.warrantyDate,
      cost: Math.max(0, input.cost || 0),
      salvageValue: Math.max(0, input.salvageValue || 0),
      usefulLifeYears: Math.max(0, input.usefulLifeYears || 0),
      depreciationMethod: input.depreciationMethod || 'STRAIGHT_LINE',
      depreciationStartDate: input.depreciationStartDate,
      accumulatedDepreciation: Math.max(0, input.accumulatedDepreciation || 0),
      currentBookValue: Math.max(0, input.currentBookValue || 0),
      locationId: input.locationId || '',
      roomId: input.roomId || '',
      description: input.description?.trim() || '',
    });

    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async listAssets(
    filters?: {
      q?: string;
      categoryId?: string;
      statusId?: string;
      locationId?: string;
      roomId?: string;
      vendorId?: string;
    },
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const query: any = { isDeleted: false };

    // Text search on assetTag, name, serialNumber, description
    if (filters?.q) {
      const searchText = filters.q.trim();
      query.$or = [
        { assetTag: { $regex: searchText, $options: 'i' } },
        { name: { $regex: searchText, $options: 'i' } },
        { serialNumber: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } },
      ];
    }

    // Filter by category
    if (filters?.categoryId) {
      query.categoryId = filters.categoryId;
    }

    // Filter by status
    if (filters?.statusId) {
      query.statusId = filters.statusId;
    }

    // Filter by location
    if (filters?.locationId) {
      query.locationId = filters.locationId;
    }

    // Filter by room
    if (filters?.roomId) {
      query.roomId = filters.roomId;
    }

    // Filter by vendor
    if (filters?.vendorId) {
      query.vendorId = filters.vendorId;
    }

    // Build sort object - allow sorting by multiple fields
    const sortObj: any = {};
    const validSortFields = ['assetTag', 'name', 'cost', 'createdAt', 'updatedAt', 'purchaseDate'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;

    const assets = await Asset.find(query)
      .populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId'])
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Asset.countDocuments(query);

    return { assets, total };
  }

  static async getAssetById(id: string) {
    const asset = await Asset.findOne({ _id: id, isDeleted: false }).populate([
      'categoryId',
      'statusId',
      'vendorId',
      'locationId',
      'roomId',
    ]);

    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'id', message: 'Asset does not exist' }];
      throw error;
    }

    return asset;
  }

  static async getAssetTimeline(id: string, page: number = 1, limit: number = 20) {
    const asset = await this.getAssetById(id);

    // Get all assignment history for this asset
    const assignments = await Assignment.find({ assetId: id, isDeleted: false })
      .populate(['employeeId'])
      .sort({ assignedAt: 1 });

    const movements = await AssetMovement.find({ assetId: id, isDeleted: false })
      .sort({ movedDate: 1 })
      .populate(['fromLocationId', 'fromRoomId', 'toLocationId', 'toRoomId', 'movedBy']);

    // Build timeline from assignments
    const events: any[] = [];

    events.push({
      timestamp: asset.createdAt,
      event: AssetTimelineEventType.CREATED,
      description: `Asset created: ${asset.assetTag}`,
    });

    for (const assignment of assignments as any[]) {
      const employeeName = assignment.employeeId?.name || 'Unknown Employee';
      
      events.push({
        timestamp: assignment.assignedAt,
        event: AssetTimelineEventType.ASSIGNED,
        description: `Assigned to employee: ${employeeName}`,
        employeeName,
        employeeId: assignment.employeeId?._id?.toString?.() || assignment.employeeId.toString(),
      });

      if (assignment.unassignedAt) {
        events.push({
          timestamp: assignment.unassignedAt,
          event: AssetTimelineEventType.UNASSIGNED,
          description: `Unassigned from employee: ${employeeName}`,
          employeeName,
          employeeId: assignment.employeeId?._id?.toString?.() || assignment.employeeId.toString(),
        });
      }
    }

    for (const movement of movements as any[]) {
      const fromLocationName = movement.fromLocationId?.name || 'Unknown location';
      const fromRoomName = movement.fromRoomId?.name || 'No room';
      const toLocationName = movement.toLocationId?.name || 'Unknown location';
      const toRoomName = movement.toRoomId?.name || 'No room';

      events.push({
        timestamp: movement.movedDate,
        event: AssetTimelineEventType.MOVED,
        description: `Moved from ${fromLocationName} / ${fromRoomName} to ${toLocationName} / ${toRoomName}`,
        reason: movement.reason,
        movedBy: movement.movedBy?.name || movement.movedBy?.email || movement.movedBy?.toString?.() || '',
      });
    }

    // Sort by timestamp descending
    const sorted = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const total = sorted.length;
    const start = (page - 1) * limit;

    return {
      assetId: asset._id,
      assetTag: asset.assetTag,
      timeline: sorted.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async moveAsset(
    id: string,
    input: {
      locationId?: string;
      roomId?: string;
      reason: string;
      movedBy: string;
      movedDate?: Date;
      latitude?: number;
      longitude?: number;
      notes?: string;
    }
  ) {
    const asset = await this.getAssetById(id);

    if (!input.reason || !input.reason.trim()) {
      const error = new Error('Movement reason is required');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'reason', message: 'Movement reason is required' }];
      throw error;
    }

    if (!input.movedBy || !input.movedBy.trim()) {
      const error = new Error('Moved by user is required');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'movedBy', message: 'Moved by user is required' }];
      throw error;
    }

    let destinationLocationId = input.locationId || '';
    let destinationRoomId = input.roomId || '';

    if (destinationRoomId) {
      const room = await Room.findOne({ _id: destinationRoomId, isDeleted: false });
      if (!room) {
        const error = new Error('Room not found');
        (error as any).statusCode = 404;
        (error as any).errors = [{ field: 'roomId', message: 'Room does not exist' }];
        throw error;
      }

      if (!destinationLocationId) {
        destinationLocationId = room.locationId?.toString?.() || room.locationId || '';
      }

      if (destinationLocationId && room.locationId?.toString?.() !== destinationLocationId) {
        const error = new Error('Room and location mismatch');
        (error as any).statusCode = 400;
        (error as any).errors = [{ field: 'roomId', message: 'Room does not belong to the selected location' }];
        throw error;
      }
    }

    if (destinationLocationId) {
      const location = await Location.findOne({ _id: destinationLocationId, isDeleted: false });
      if (!location) {
        const error = new Error('Location not found');
        (error as any).statusCode = 404;
        (error as any).errors = [{ field: 'locationId', message: 'Location does not exist' }];
        throw error;
      }
    }

    if (!destinationLocationId && !destinationRoomId) {
      const error = new Error('Destination is required');
      (error as any).statusCode = 400;
      (error as any).errors = [
        { field: 'locationId', message: 'Location or room is required when moving an asset' },
      ];
      throw error;
    }

    const movement = await AssetMovement.create({
      assetId: asset._id.toString(),
      fromLocationId: asset.locationId?.toString?.() || '',
      fromRoomId: asset.roomId?.toString?.() || '',
      toLocationId: destinationLocationId,
      toRoomId: destinationRoomId,
      movedBy: input.movedBy,
      reason: input.reason.trim(),
      movedDate: input.movedDate || new Date(),
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes?.trim() || '',
    });

    asset.locationId = destinationLocationId || ('' as any);
    asset.roomId = destinationRoomId || ('' as any);
    await asset.save();

    return {
      asset: await asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']),
      movement,
    };
  }

  static async getAssetMovements(id: string, page: number = 1, limit: number = 20) {
    await this.getAssetById(id);

    const query = { assetId: id, isDeleted: false };
    const movements = await AssetMovement.find(query)
      .sort({ movedDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(['fromLocationId', 'fromRoomId', 'toLocationId', 'toRoomId', 'movedBy']);

    const total = await AssetMovement.countDocuments(query);

    return {
      movements,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async updateAsset(id: string, input: Partial<AssetInput>) {
    const asset = await this.getAssetById(id);

    if (input.categoryId || input.statusId || input.vendorId || input.locationId || input.roomId) {
      await this.validateReferences({
        assetTag: input.assetTag || asset.assetTag,
        name: input.name || asset.name,
        categoryId: input.categoryId || asset.categoryId.toString(),
        statusId: input.statusId || asset.statusId.toString(),
        vendorId: input.vendorId || (asset.vendorId?.toString() || undefined),
        locationId: input.locationId || (asset.locationId?.toString() || undefined),
        roomId: input.roomId || (asset.roomId?.toString() || undefined),
      });
    }

    const duplicate = await this.findDuplicate(
      input.assetTag || asset.assetTag,
      input.serialNumber || asset.serialNumber,
      id
    );

    if (duplicate) {
      const errors = [];
      if (input.assetTag && duplicate.assetTag === normalizeText(input.assetTag)) {
        errors.push({ field: 'assetTag', message: 'Asset tag already exists' });
      }
      if (input.serialNumber && duplicate.serialNumber === normalizeText(input.serialNumber)) {
        errors.push({ field: 'serialNumber', message: 'Serial number already exists' });
      }

      const error = new Error('Duplicate asset information');
      (error as any).statusCode = 409;
      (error as any).errors = errors;
      throw error;
    }

    if (input.assetTag) asset.assetTag = normalizeText(input.assetTag);
    if (input.name) asset.name = normalizeText(input.name);
    if (input.serialNumber !== undefined) asset.serialNumber = input.serialNumber ? normalizeText(input.serialNumber) : '';
    if (input.deviceModel !== undefined) asset.deviceModel = input.deviceModel?.trim() || '';
    if (input.categoryId) asset.categoryId = input.categoryId as any;
    if (input.statusId) asset.statusId = input.statusId as any;
    if (input.vendorId !== undefined) asset.vendorId = input.vendorId || ('' as any);
    if (input.purchaseDate !== undefined) asset.purchaseDate = input.purchaseDate;
    if (input.warrantyDate !== undefined) asset.warrantyDate = input.warrantyDate;
    if (input.cost !== undefined) asset.cost = Math.max(0, input.cost || 0);
    if (input.salvageValue !== undefined) asset.salvageValue = Math.max(0, input.salvageValue || 0);
    if (input.usefulLifeYears !== undefined) asset.usefulLifeYears = Math.max(0, input.usefulLifeYears || 0);
    if (input.depreciationMethod !== undefined) asset.depreciationMethod = input.depreciationMethod.trim() || 'STRAIGHT_LINE';
    if (input.depreciationStartDate !== undefined) asset.depreciationStartDate = input.depreciationStartDate;
    if (input.accumulatedDepreciation !== undefined) asset.accumulatedDepreciation = Math.max(0, input.accumulatedDepreciation || 0);
    if (input.currentBookValue !== undefined) asset.currentBookValue = Math.max(0, input.currentBookValue || 0);
    if (input.locationId !== undefined) asset.locationId = input.locationId || ('' as any);
    if (input.roomId !== undefined) asset.roomId = input.roomId || ('' as any);
    if (input.description !== undefined) asset.description = input.description?.trim() || '';

    await asset.save();
    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async deleteAsset(id: string) {
    const asset = await this.getAssetById(id);
    asset.isDeleted = true;
    await asset.save();
    return asset;
  }

  static async assignAssetToRoom(id: string, roomId: string) {
    const asset = await this.getAssetById(id);

    if (asset.roomId) {
      const error = new Error('Asset already assigned to a room');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'roomId', message: 'Asset must be unassigned before assigning to another room' }];
      throw error;
    }

    const room = await Room.findOne({ _id: roomId, isDeleted: false });
    if (!room) {
      const error = new Error('Room not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'roomId', message: 'Room does not exist' }];
      throw error;
    }

    asset.roomId = roomId as any;
    await asset.save();

    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async unassignAssetFromRoom(id: string) {
    const asset = await this.getAssetById(id);

    if (!asset.roomId) {
      const error = new Error('Asset is not assigned to a room');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'roomId', message: 'Asset is not currently assigned to a room' }];
      throw error;
    }

    asset.roomId = '' as any;
    await asset.save();

    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async reassignAssetToRoom(id: string, roomId: string) {
    const asset = await this.getAssetById(id);

    const room = await Room.findOne({ _id: roomId, isDeleted: false });
    if (!room) {
      const error = new Error('Room not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'roomId', message: 'Room does not exist' }];
      throw error;
    }

    asset.roomId = roomId as any;
    await asset.save();

    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async listAssetsByRoom(roomId: string, page: number = 1, limit: number = 10) {
    const room = await Room.findOne({ _id: roomId, isDeleted: false });
    if (!room) {
      const error = new Error('Room not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'roomId', message: 'Room does not exist' }];
      throw error;
    }

    return this.listAssets({ roomId }, page, limit);
  }

  static async getAssetBarcode(id: string) {
    const asset = await this.getAssetById(id);

    const barcodeData = asset.barcodeData || this.generateBarcodeData(asset._id.toString(), asset.assetTag);

    if (!asset.barcodeData) {
      asset.barcodeData = barcodeData;
      await asset.save();
    }

    return {
      assetId: asset._id,
      assetTag: asset.assetTag,
      barcodeData,
      format: 'code128', // Standard barcode format for assets
    };
  }

  static async getAssetQRCode(id: string) {
    const asset = await this.getAssetById(id);

    const qrCodeData = asset.qrCodeData || this.generateQRCodeData(asset._id.toString(), asset.assetTag);

    if (!asset.qrCodeData) {
      asset.qrCodeData = qrCodeData;
      await asset.save();
    }

    return {
      assetId: asset._id,
      assetTag: asset.assetTag,
      qrCodeData,
      format: 'QR_CODE', // QR code format
    };
  }

  static async isLaptopCategory(categoryId: string): Promise<boolean> {
    const category = await AssetCategory.findOne({ _id: categoryId, isDeleted: false });
    return category ? category.code?.toUpperCase().includes(AssetCategoryCode.LAPTOP) : false;
  }

  static async isDesktopCategory(categoryId: string): Promise<boolean> {
    const category = await AssetCategory.findOne({ _id: categoryId, isDeleted: false });
    return category ? category.code?.toUpperCase() === AssetCategoryCode.DESKTOP : false;
  }

  static async updateLaptopDetails(id: string, details: any) {
    const asset = await this.getAssetById(id);

    // Verify that the asset belongs to a laptop category
    const isLaptop = await this.isLaptopCategory(asset.categoryId);
    if (!isLaptop) {
      const error = new Error('Laptop details can only be set for laptop category assets');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'categoryId', message: 'Asset is not a laptop' }];
      throw error;
    }

    // Validate and set laptop-specific fields
    if (details.wifiMac !== undefined && details.wifiMac) {
      const existing = await Asset.findOne({
        _id: { $ne: id },
        wifiMac: details.wifiMac?.toLowerCase(),
        isDeleted: false,
      });
      if (existing) {
        const error = new Error('Wi-Fi MAC address already in use');
        (error as any).statusCode = 400;
        (error as any).errors = [{ field: 'wifiMac', message: 'This Wi-Fi MAC address is already assigned to another asset' }];
        throw error;
      }
      asset.wifiMac = details.wifiMac?.toLowerCase();
    }

    if (details.lanMac !== undefined && details.lanMac) {
      const existing = await Asset.findOne({
        _id: { $ne: id },
        lanMac: details.lanMac?.toLowerCase(),
        isDeleted: false,
      });
      if (existing) {
        const error = new Error('LAN MAC address already in use');
        (error as any).statusCode = 400;
        (error as any).errors = [{ field: 'lanMac', message: 'This LAN MAC address is already assigned to another asset' }];
        throw error;
      }
      asset.lanMac = details.lanMac?.toLowerCase();
    }

    if (details.splunkId !== undefined && details.splunkId) {
      const existing = await Asset.findOne({
        _id: { $ne: id },
        splunkId: details.splunkId,
        isDeleted: false,
      });
      if (existing) {
        const error = new Error('Splunk ID already in use');
        (error as any).statusCode = 400;
        (error as any).errors = [{ field: 'splunkId', message: 'This Splunk ID is already assigned to another asset' }];
        throw error;
      }
      asset.splunkId = normalizeText(details.splunkId);
    }

    if (details.ciscoId !== undefined) asset.ciscoId = details.ciscoId ? normalizeText(details.ciscoId) : '';
    if (details.processor !== undefined) asset.processor = details.processor ? normalizeText(details.processor) : '';
    if (details.ram !== undefined) asset.ram = details.ram ? normalizeText(details.ram) : '';
    if (details.storage !== undefined) asset.storage = details.storage ? normalizeText(details.storage) : '';
    if (details.os !== undefined) asset.os = details.os ? normalizeText(details.os) : '';

    await asset.save();
    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async updateDesktopDetails(id: string, details: any) {
    const asset = await this.getAssetById(id);

    // Verify that the asset belongs to a desktop category
    const isDesktop = await this.isDesktopCategory(asset.categoryId);
    if (!isDesktop) {
      const error = new Error('Desktop details can only be set for desktop category assets');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'categoryId', message: 'Asset is not a desktop' }];
      throw error;
    }

    // Validate unique desktopSerial
    if (details.desktopSerial !== undefined && details.desktopSerial) {
      const existing = await Asset.findOne({
        _id: { $ne: id },
        desktopSerial: normalizeText(details.desktopSerial),
        isDeleted: false,
      });
      if (existing) {
        const error = new Error('Desktop serial already in use');
        (error as any).statusCode = 400;
        (error as any).errors = [{ field: 'desktopSerial', message: 'This desktop serial is already assigned to another asset' }];
        throw error;
      }
      asset.desktopSerial = normalizeText(details.desktopSerial);
    }

    // Validate unique assetUuid
    if (details.assetUuid !== undefined && details.assetUuid) {
      const existing = await Asset.findOne({
        _id: { $ne: id },
        assetUuid: details.assetUuid.toLowerCase(),
        isDeleted: false,
      });
      if (existing) {
        const error = new Error('Asset UUID already in use');
        (error as any).statusCode = 400;
        (error as any).errors = [{ field: 'assetUuid', message: 'This UUID is already assigned to another asset' }];
        throw error;
      }
      asset.assetUuid = details.assetUuid.toLowerCase();
    }

    if (details.motherboardSerial !== undefined) asset.motherboardSerial = details.motherboardSerial ? normalizeText(details.motherboardSerial) : '';
    if (details.graphicsCard !== undefined) asset.graphicsCard = details.graphicsCard ? normalizeText(details.graphicsCard) : '';

    await asset.save();
    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async getDesktopDetails(id: string) {
    const asset = await this.getAssetById(id);

    const isDesktop = await this.isDesktopCategory(asset.categoryId);
    if (!isDesktop) {
      const error = new Error('Asset is not a desktop');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'categoryId', message: 'Desktop details are only available for desktop category assets' }];
      throw error;
    }

    return {
      assetId: asset._id,
      assetTag: asset.assetTag,
      name: asset.name,
      desktopDetails: {
        desktopSerial: asset.desktopSerial || '',
        assetUuid: asset.assetUuid || '',
        motherboardSerial: asset.motherboardSerial || '',
        graphicsCard: asset.graphicsCard || '',
      },
    };
  }

  static async getLaptopDetails(id: string) {
    const asset = await this.getAssetById(id);

    // Verify that the asset belongs to a laptop category
    const isLaptop = await this.isLaptopCategory(asset.categoryId);
    if (!isLaptop) {
      const error = new Error('Asset is not a laptop');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'categoryId', message: 'Laptop details are only available for laptop category assets' }];
      throw error;
    }

    return {
      assetId: asset._id,
      assetTag: asset.assetTag,
      name: asset.name,
      laptopDetails: {
        wifiMac: asset.wifiMac || '',
        lanMac: asset.lanMac || '',
        splunkId: asset.splunkId || '',
        ciscoId: asset.ciscoId || '',
        processor: asset.processor || '',
        ram: asset.ram || '',
        storage: asset.storage || '',
        os: asset.os || '',
      },
    };
  }

  static async updateWarranty(id: string, warrantyDate: Date) {
    const asset = await this.getAssetById(id);
    asset.warrantyDate = warrantyDate;
    await asset.save();
    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async extendWarranty(id: string, extendedUntilDate: Date) {
    const asset = await this.getAssetById(id);

    if (!asset.warrantyDate) {
      const error = new Error('Asset does not have warranty information');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'warrantyDate', message: 'Cannot extend warranty when original warranty date is not set' }];
      throw error;
    }

    if (extendedUntilDate <= asset.warrantyDate) {
      const error = new Error('Extended warranty date must be after original warranty date');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'extendedUntilDate', message: 'Extended warranty date must be later than current warranty date' }];
      throw error;
    }

    asset.warrantyExtendedUntil = extendedUntilDate;
    await asset.save();
    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }

  static async getExpiringWarranties(daysThreshold: number = 30, page: number = 1, limit: number = 20) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const query = {
      isDeleted: false,
      $or: [
        {
          warrantyDate: { $lte: futureDate, $gte: now },
          warrantyExtendedUntil: { $exists: false },
        },
        {
          warrantyExtendedUntil: { $lte: futureDate, $gte: now },
        },
      ],
    };

    const assets = await Asset.find(query)
      .sort({ warrantyDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);

    const total = await Asset.countDocuments(query);

    return {
      assets,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async getExpiringLicenses(daysThreshold: number = 30, page: number = 1, limit: number = 20) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const query = {
      isDeleted: false,
      licenseExpiryDate: { $lte: futureDate, $gte: now },
    };

    const assets = await Asset.find(query)
      .sort({ licenseExpiryDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);

    const total = await Asset.countDocuments(query);

    return {
      assets,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async updateLicense(id: string, licenseData: { licenseKey?: string; licenseName?: string; licenseVendor?: string; licenseExpiryDate?: Date }) {
    const asset = await this.getAssetById(id);

    if (licenseData.licenseKey !== undefined) asset.licenseKey = licenseData.licenseKey;
    if (licenseData.licenseName !== undefined) asset.licenseName = licenseData.licenseName;
    if (licenseData.licenseVendor !== undefined) asset.licenseVendor = licenseData.licenseVendor;
    if (licenseData.licenseExpiryDate !== undefined) asset.licenseExpiryDate = licenseData.licenseExpiryDate;

    await asset.save();
    return asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']);
  }
}

export default AssetService;
