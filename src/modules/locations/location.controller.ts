import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { LocationService } from './location.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AssetService } from '../assets/asset.service';

const validationError = (field: string, message: string) => [{ field, message }];

const isValidLocationType = (type: unknown): type is 'office' | 'branch' | 'building' | 'floor' => {
  return type === 'office' || type === 'branch' || type === 'building' || type === 'floor';
};

export class LocationController {
  static async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type, description, address, parentLocationId } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Location name is required')));
      }

      if (!type || !isValidLocationType(type)) {
        return res.status(400).json(
          errorResponse('Validation failed', validationError('type', 'Location type must be office, branch, building, or floor'))
        );
      }

      const duplicate = await LocationService.findDuplicate(name);
      if (duplicate) {
        return res.status(409).json(errorResponse('Validation failed', validationError('name', 'Location name already exists')));
      }

      const location = await LocationService.createLocation({
        name,
        type,
        description,
        address,
        parentLocationId,
      });

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: null,
        newValue: location,
      });

      return res.status(201).json(successResponse('Location created successfully', location));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.code === 11000) {
        return res.status(409).json(errorResponse('Validation failed', validationError('name', 'Location name already exists')));
      }

      next(error);
    }
  }

  static async listLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const locations = await LocationService.listLocations();
      return res.status(200).json(successResponse('Locations retrieved successfully', locations, { total: locations.length }));
    } catch (error) {
      next(error);
    }
  }

  static async getLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await LocationService.getLocationById(req.params.id as string);
      if (!location) {
        return res.status(404).json(errorResponse('Location not found'));
      }

      return res.status(200).json(successResponse('Location retrieved successfully', location));
    } catch (error) {
      next(error);
    }
  }

  static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, address, parentLocationId } = req.body;

      if (name !== undefined && typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Location name must be a string')));
      }

      if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('description', 'Description must be a string')));
      }

      if (address !== undefined && typeof address !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('address', 'Address must be a string')));
      }

      const oldLocation = await LocationService.getLocationById(req.params.id as string);
      if (!oldLocation) {
        return res.status(404).json(errorResponse('Location not found'));
      }

      if (name !== undefined) {
        const duplicate = await LocationService.findDuplicate(name, req.params.id as string);
        if (duplicate) {
          return res.status(409).json(errorResponse('Validation failed', validationError('name', 'Location name already exists')));
        }
      }

      const location = await LocationService.updateLocation(req.params.id as string, {
        name,
        description,
        address,
        parentLocationId,
      });

      if (!location) {
        return res.status(404).json(errorResponse('Location not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldLocation,
        newValue: location,
      });

      return res.status(200).json(successResponse('Location updated successfully', location));
    } catch (error: any) {
      if (error?.statusCode === 400 && error?.errors) {
        return res.status(400).json(errorResponse('Validation failed', error.errors));
      }

      if (error?.code === 11000) {
        return res.status(409).json(errorResponse('Validation failed', validationError('name', 'Location name already exists')));
      }

      next(error);
    }
  }

  static async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const oldLocation = await LocationService.getLocationById(req.params.id as string);
      if (!oldLocation) {
        return res.status(404).json(errorResponse('Location not found'));
      }

      const location = await LocationService.deleteLocation(req.params.id as string);
      if (!location) {
        return res.status(404).json(errorResponse('Location not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldLocation,
        newValue: { isDeleted: true },
      });

      return res.status(200).json(successResponse('Location deleted successfully', location));
    } catch (error) {
      next(error);
    }
  }

  static async getLocationAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await LocationService.getLocationById(String(req.params.id));
      if (!location) {
        return res.status(404).json(errorResponse('Location not found'));
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const result = await AssetService.listAssets({ locationId: String(req.params.id) }, page, limit, 'updatedAt', 'desc');

      return res.status(200).json(
        successResponse('Location assets retrieved successfully', result.assets, {
          locationId: req.params.id,
          total: result.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
