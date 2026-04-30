import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { AssetService } from './asset.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class AssetController {
  static async generateAssetTag(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId } = req.body;

      if (!categoryId || typeof categoryId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('categoryId', 'Category ID is required')));
      }

      const generatedTag = await AssetService.generateAssetTag(categoryId);

      return res.status(200).json(
        successResponse('Asset tag generated successfully', { assetTag: generatedTag })
      );
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async createAsset(req: Request, res: Response, next: NextFunction) {
    try {
      let {
        assetTag,
        name,
        serialNumber,
        deviceModel,
        categoryId,
        statusId,
        vendorId,
        purchaseDate,
        warrantyDate,
        cost,
        salvageValue,
        usefulLifeYears,
        depreciationMethod,
        depreciationStartDate,
        locationId,
        roomId,
        description,
      } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Asset name is required')));
      }

      if (!categoryId || typeof categoryId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('categoryId', 'Category ID is required')));
      }

      if (!statusId || typeof statusId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('statusId', 'Status ID is required')));
      }

      // Auto-generate asset tag if not provided
      if (!assetTag || typeof assetTag !== 'string') {
        assetTag = await AssetService.generateAssetTag(categoryId);
      }

      if (cost !== undefined && (typeof cost !== 'number' || cost < 0)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('cost', 'Cost must be a non-negative number')));
      }

      if (salvageValue !== undefined && (typeof salvageValue !== 'number' || salvageValue < 0)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('salvageValue', 'Salvage value must be a non-negative number')));
      }

      if (usefulLifeYears !== undefined && (typeof usefulLifeYears !== 'number' || usefulLifeYears < 0)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('usefulLifeYears', 'Useful life years must be a non-negative number')));
      }

      if (depreciationMethod !== undefined && String(depreciationMethod) !== 'STRAIGHT_LINE') {
        return res.status(400).json(errorResponse('Validation failed', validationError('depreciationMethod', 'Depreciation method must be STRAIGHT_LINE')));
      }

      const asset = await AssetService.createAsset({
        assetTag,
        name,
        serialNumber,
        deviceModel,
        categoryId,
        statusId,
        vendorId,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        warrantyDate: warrantyDate ? new Date(warrantyDate) : undefined,
        cost,
        salvageValue,
        usefulLifeYears,
        depreciationMethod: depreciationMethod ? String(depreciationMethod) : undefined,
        depreciationStartDate: depreciationStartDate ? new Date(depreciationStartDate) : undefined,
        locationId,
        roomId,
        description,
      });

      if (asset) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: asset,
        });
      }

      return res.status(201).json(successResponse('Asset created successfully', asset));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 409 && error?.errors) {
        return res.status(409).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async listAssets(req: Request, res: Response, next: NextFunction) {
    try {
      // Search and filter parameters
      const q = (req.query.q as string) || undefined;
      const categoryId = (req.query.categoryId as string) || undefined;
      const statusId = (req.query.statusId as string) || undefined;
      const locationId = (req.query.locationId as string) || undefined;
      const roomId = (req.query.roomId as string) || undefined;
      const vendorId = (req.query.vendorId as string) || undefined;

      // Pagination and sorting parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

      const filters = {
        q,
        categoryId,
        statusId,
        locationId,
        roomId,
        vendorId,
      };

      const { assets, total } = await AssetService.listAssets(filters, page, limit, sortBy, sortOrder);

      return res.status(200).json(
        successResponse('Assets retrieved successfully', assets, {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          sortBy,
          sortOrder,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const asset = await AssetService.getAssetById(req.params.id as string);

      return res.status(200).json(successResponse('Asset retrieved successfully', asset));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async updateAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        assetTag,
        name,
        serialNumber,
        deviceModel,
        categoryId,
        statusId,
        vendorId,
        purchaseDate,
        warrantyDate,
        cost,
        salvageValue,
        usefulLifeYears,
        depreciationMethod,
        depreciationStartDate,
        locationId,
        roomId,
        description,
      } = req.body;

      if (cost !== undefined && (typeof cost !== 'number' || cost < 0)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('cost', 'Cost must be a non-negative number')));
      }

      if (salvageValue !== undefined && (typeof salvageValue !== 'number' || salvageValue < 0)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('salvageValue', 'Salvage value must be a non-negative number')));
      }

      if (usefulLifeYears !== undefined && (typeof usefulLifeYears !== 'number' || usefulLifeYears < 0)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('usefulLifeYears', 'Useful life years must be a non-negative number')));
      }

      if (depreciationMethod !== undefined && String(depreciationMethod) !== 'STRAIGHT_LINE') {
        return res.status(400).json(errorResponse('Validation failed', validationError('depreciationMethod', 'Depreciation method must be STRAIGHT_LINE')));
      }

      const updatedAsset = await AssetService.updateAsset(req.params.id as string, {
        assetTag,
        name,
        serialNumber,
        deviceModel,
        categoryId,
        statusId,
        vendorId,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        warrantyDate: warrantyDate ? new Date(warrantyDate) : undefined,
        cost,
        salvageValue,
        usefulLifeYears,
        depreciationMethod: depreciationMethod ? String(depreciationMethod) : undefined,
        depreciationStartDate: depreciationStartDate ? new Date(depreciationStartDate) : undefined,
        locationId,
        roomId,
        description,
      });

      if (updatedAsset) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: updatedAsset,
        });
      }

      return res.status(200).json(successResponse('Asset updated successfully', updatedAsset));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 409 && error?.errors) {
        return res.status(409).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async deleteAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedAsset = await AssetService.deleteAsset(req.params.id as string);

      if (deletedAsset) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: deletedAsset,
        });
      }

      return res.status(200).json(successResponse('Asset deleted successfully', deletedAsset));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async assignAssetToRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.body;

      if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('roomId', 'Room ID is required')));
      }

      const updatedAsset = await AssetService.assignAssetToRoom(req.params.id as string, roomId);

      if (updatedAsset) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: updatedAsset,
        });
      }

      return res.status(200).json(successResponse('Asset assigned to room successfully', updatedAsset));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Room not found'));
      }

      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async unassignAssetFromRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedAsset = await AssetService.unassignAssetFromRoom(req.params.id as string);

      if (updatedAsset) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: updatedAsset,
        });
      }

      return res.status(200).json(successResponse('Asset unassigned from room successfully', updatedAsset));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async reassignAssetToRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.body;

      if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('roomId', 'Room ID is required')));
      }

      const updatedAsset = await AssetService.reassignAssetToRoom(req.params.id as string, roomId);

      if (updatedAsset) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: updatedAsset,
        });
      }

      return res.status(200).json(successResponse('Asset reassigned to room successfully', updatedAsset));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Room not found'));
      }

      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async getAssetBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const barcodeInfo = await AssetService.getAssetBarcode(req.params.id as string);

      return res.status(200).json(
        successResponse('Asset barcode retrieved successfully', barcodeInfo)
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async getAssetQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const qrInfo = await AssetService.getAssetQRCode(req.params.id as string);

      return res.status(200).json(
        successResponse('Asset QR code retrieved successfully', qrInfo)
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async updateLaptopDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { wifiMac, lanMac, splunkId, ciscoId, processor, ram, storage, os } = req.body;

      const updatedAsset = await AssetService.updateLaptopDetails(req.params.id as string, {
        wifiMac,
        lanMac,
        splunkId,
        ciscoId,
        processor,
        ram,
        storage,
        os,
      });

      if (updatedAsset) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: updatedAsset,
        });
      }

      return res.status(200).json(successResponse('Laptop details updated successfully', updatedAsset));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async getLaptopDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const laptopDetails = await AssetService.getLaptopDetails(req.params.id as string);

      return res.status(200).json(
        successResponse('Laptop details retrieved successfully', laptopDetails)
      );
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async updateDesktopDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { desktopSerial, assetUuid, motherboardSerial, graphicsCard } = req.body;

      const updatedAsset = await AssetService.updateDesktopDetails(req.params.id as string, {
        desktopSerial,
        assetUuid,
        motherboardSerial,
        graphicsCard,
      });

      if (updatedAsset) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: updatedAsset,
        });
      }

      return res.status(200).json(successResponse('Desktop details updated successfully', updatedAsset));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async getDesktopDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const desktopDetails = await AssetService.getDesktopDetails(req.params.id as string);

      return res.status(200).json(
        successResponse('Desktop details retrieved successfully', desktopDetails)
      );
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async getAssetTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const timeline = await AssetService.getAssetTimeline(req.params.id as string, page, limit);

      return res.status(200).json(
        successResponse('Asset timeline retrieved successfully', timeline.timeline, {
          assetId: timeline.assetId,
          assetTag: timeline.assetTag,
          total: timeline.total,
          page: timeline.page,
          limit: timeline.limit,
          totalPages: timeline.totalPages,
        })
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async moveAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, roomId, reason, movedDate, latitude, longitude, notes } = req.body;

      if (!locationId && !roomId) {
        return res.status(400).json(
          errorResponse('Validation failed', validationError('locationId', 'Location ID or room ID is required'))
        );
      }

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('reason', 'Movement reason is required')));
      }

      const movedBy = String((res.locals as any).user?.id || '');
      const currentAsset = await AssetService.getAssetById(String(req.params.id));
      const result = await AssetService.moveAsset(String(req.params.id), {
        locationId: locationId ? String(locationId) : undefined,
        roomId: roomId ? String(roomId) : undefined,
        reason: String(reason),
        movedBy,
        movedDate: movedDate ? new Date(movedDate) : undefined,
        latitude: latitude !== undefined ? Number(latitude) : undefined,
        longitude: longitude !== undefined ? Number(longitude) : undefined,
        notes: notes ? String(notes) : undefined,
      });

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: { locationId: currentAsset.locationId, roomId: currentAsset.roomId },
        newValue: { locationId, roomId, reason, movedDate, latitude, longitude, notes },
      });

      return res.status(200).json(
        successResponse('Asset moved successfully', {
          asset: result.asset,
          movement: result.movement,
        })
      );
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset, location, or room not found'));
      }

      next(error);
    }
  }

  static async getAssetMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const result = await AssetService.getAssetMovements(String(req.params.id), page, limit);

      return res.status(200).json(
        successResponse('Asset movement history retrieved successfully', result.movements, {
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

  static async listTrackedAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const q = (req.query.q as string) || undefined;
      const locationId = (req.query.locationId as string) || undefined;
      const roomId = (req.query.roomId as string) || undefined;

      const { assets, total } = await AssetService.listAssets({ q, locationId, roomId }, page, limit, 'updatedAt', 'desc');

      return res.status(200).json(
        successResponse('Tracked assets retrieved successfully', assets, {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateWarranty(req: Request, res: Response, next: NextFunction) {
    try {
      const { warrantyDate } = req.body;

      if (!warrantyDate) {
        return res.status(400).json(errorResponse('Validation failed', validationError('warrantyDate', 'Warranty date is required')));
      }

      const asset = await AssetService.updateWarranty(String(req.params.id), new Date(warrantyDate));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { warrantyDate },
      });

      return res.status(200).json(successResponse('Asset warranty updated successfully', asset));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async extendWarranty(req: Request, res: Response, next: NextFunction) {
    try {
      const { extendedUntilDate } = req.body;

      if (!extendedUntilDate) {
        return res.status(400).json(errorResponse('Validation failed', validationError('extendedUntilDate', 'Extended until date is required')));
      }

      const asset = await AssetService.extendWarranty(String(req.params.id), new Date(extendedUntilDate));

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: { action: 'warranty_extended', extendedUntilDate },
      });

      return res.status(200).json(successResponse('Asset warranty extended successfully', asset));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async getExpiringWarranties(req: Request, res: Response, next: NextFunction) {
    try {
      const daysThreshold = Math.min(365, parseInt(req.query.days as string) || 30);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const result = await AssetService.getExpiringWarranties(daysThreshold, page, limit);

      return res.status(200).json(
        successResponse('Expiring warranties retrieved successfully', result.assets, {
          daysThreshold,
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

  static async getExpiringLicenses(req: Request, res: Response, next: NextFunction) {
    try {
      const daysThreshold = Math.min(365, parseInt(req.query.days as string) || 30);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const result = await AssetService.getExpiringLicenses(daysThreshold, page, limit);

      return res.status(200).json(
        successResponse('Expiring licenses retrieved successfully', result.assets, {
          daysThreshold,
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

  static async updateLicense(req: Request, res: Response, next: NextFunction) {
    try {
      const { licenseKey, licenseName, licenseVendor, licenseExpiryDate } = req.body;

      const updates: any = {};
      if (licenseKey !== undefined) updates.licenseKey = String(licenseKey);
      if (licenseName !== undefined) updates.licenseName = String(licenseName);
      if (licenseVendor !== undefined) updates.licenseVendor = String(licenseVendor);
      if (licenseExpiryDate !== undefined) updates.licenseExpiryDate = new Date(licenseExpiryDate);

      if (Object.keys(updates).length === 0) {
        return res.status(400).json(errorResponse('Validation failed', validationError('body', 'At least one license field is required')));
      }

      const asset = await AssetService.updateLicense(String(req.params.id), updates);

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: updates,
      });

      return res.status(200).json(successResponse('Asset license updated successfully', asset));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }

  static async createDepreciation(req: Request, res: Response, next: NextFunction) {
    try {
      const { salvageValue, usefulLifeYears, depreciationMethod, depreciationStartDate } = req.body;

      if (salvageValue !== undefined && (typeof salvageValue !== 'number' || salvageValue < 0)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('salvageValue', 'Salvage value must be a non-negative number')));
      }

      if (usefulLifeYears !== undefined && (typeof usefulLifeYears !== 'number' || usefulLifeYears <= 0)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('usefulLifeYears', 'Useful life years must be greater than zero')));
      }

      if (depreciationMethod !== undefined && String(depreciationMethod) !== 'STRAIGHT_LINE') {
        return res.status(400).json(errorResponse('Validation failed', validationError('depreciationMethod', 'Depreciation method must be STRAIGHT_LINE')));
      }

      const result = await (await import('./asset-depreciation.service')).default.recordDepreciation(String(req.params.id), {
        salvageValue: salvageValue !== undefined ? Number(salvageValue) : undefined,
        usefulLifeYears: usefulLifeYears !== undefined ? Number(usefulLifeYears) : undefined,
        depreciationMethod: depreciationMethod ? String(depreciationMethod) : undefined,
        depreciationStartDate: depreciationStartDate ? new Date(depreciationStartDate) : undefined,
      });

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: {},
        newValue: result.record,
      });

      return res.status(201).json(successResponse('Depreciation calculated successfully', result));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async getAssetDepreciation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await (await import('./asset-depreciation.service')).default.getDepreciationHistory(String(req.params.id));

      return res.status(200).json(
        successResponse('Asset depreciation retrieved successfully', result.records, {
          assetId: result.assetId,
          total: result.total,
          currentBookValue: result.currentBookValue,
        })
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Asset not found'));
      }

      next(error);
    }
  }
}

export default AssetController;
