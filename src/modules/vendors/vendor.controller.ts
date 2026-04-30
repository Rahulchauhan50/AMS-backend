import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { VendorService } from './vendor.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

export class VendorController {
  static async createVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, taxNumber, address, city, country, website, contactPerson, rating } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Vendor name is required')));
      }

      if (rating !== undefined && (typeof rating !== 'number' || rating < 0 || rating > 5)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('rating', 'Rating must be between 0 and 5')));
      }

      const vendor = await VendorService.createVendor({
        name,
        email,
        phone,
        taxNumber,
        address,
        city,
        country,
        website,
        contactPerson,
        rating,
      });

      if (vendor) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: vendor,
        });
      }

      return res.status(201).json(successResponse('Vendor created successfully', vendor));
    } catch (error: any) {
      if (error?.statusCode === 409 && error?.errors) {
        return res.status(409).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async listVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

      const { vendors, total } = await VendorService.listVendors(page, limit);

      return res.status(200).json(
        successResponse('Vendors retrieved successfully', vendors, {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendor = await VendorService.getVendorById(req.params.id as string);

      return res.status(200).json(successResponse('Vendor retrieved successfully', vendor));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Vendor not found'));
      }

      next(error);
    }
  }

  static async updateVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, taxNumber, address, city, country, website, contactPerson, rating } = req.body;

      if (rating !== undefined && (typeof rating !== 'number' || rating < 0 || rating > 5)) {
        return res.status(400).json(errorResponse('Validation failed', validationError('rating', 'Rating must be between 0 and 5')));
      }

      const updatedVendor = await VendorService.updateVendor(req.params.id as string, {
        name,
        email,
        phone,
        taxNumber,
        address,
        city,
        country,
        website,
        contactPerson,
        rating,
      });

      if (updatedVendor) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: updatedVendor,
        });
      }

      return res.status(200).json(successResponse('Vendor updated successfully', updatedVendor));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Vendor not found'));
      }

      if (error?.statusCode === 409 && error?.errors) {
        return res.status(409).json(errorResponse('Validation failed', error.errors));
      }

      next(error);
    }
  }

  static async deleteVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedVendor = await VendorService.deleteVendor(req.params.id as string);

      if (deletedVendor) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: null,
          newValue: deletedVendor,
        });
      }

      return res.status(200).json(successResponse('Vendor deleted successfully', deletedVendor));
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json(errorResponse('Vendor not found'));
      }

      next(error);
    }
  }
}

export default VendorController;
