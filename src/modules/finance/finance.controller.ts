import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../common/response/response.formatter';
import AssetDepreciationService from '../assets/asset-depreciation.service';

export class FinanceController {
  static async getDepreciationSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await AssetDepreciationService.getDepreciationSummary();
      return res.status(200).json(successResponse('Depreciation summary retrieved successfully', summary));
    } catch (error) {
      next(error);
    }
  }

  static async getAssetValueSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await AssetDepreciationService.getAssetValueSummary();
      return res.status(200).json(successResponse('Asset value summary retrieved successfully', summary));
    } catch (error) {
      next(error);
    }
  }
}

export default FinanceController;