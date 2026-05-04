import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../common/response/response.formatter';
import { AdminService } from './admin.service';

export class AdminController {
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await AdminService.getMetrics();
      return res.status(200).json(successResponse('Admin metrics retrieved successfully', metrics));
    } catch (error: any) {
      return next(error);
    }
  }

  static async getLogsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await AdminService.getLogsSummary();
      return res.status(200).json(successResponse('Audit log summary retrieved successfully', summary));
    } catch (error: any) {
      return next(error);
    }
  }
}