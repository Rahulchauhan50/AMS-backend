import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import AssetLifecycleService from './asset-lifecycle.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AssetLifecycleState } from '../../common/enums';

const validationError = (field: string, message: string) => [{ field, message }];

export class AssetLifecycleController {
  static async transitionAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { newState, reason } = req.body;
      const assetId = req.params.id;

      if (!newState || !Object.values(AssetLifecycleState).includes(newState)) {
        const validStates = Object.values(AssetLifecycleState).join(', ');
        return res.status(400).json(
          errorResponse('Validation failed', validationError('newState', `State must be one of: ${validStates}`))
        );
      }

      const performedBy = String((res.locals as any).user?.id || '');
      const result = await AssetLifecycleService.transitionAsset(String(assetId), newState, performedBy, reason ? String(reason) : undefined);

      if (result.event) {
        await AuditLogService.record(res.locals.auditContext, {
          oldValue: { state: result.event.oldState },
          newValue: { state: result.event.newState, reason: result.event.reason },
        });
      }

      return res.status(200).json(successResponse('Asset lifecycle transitioned successfully', {
        asset: result.asset,
        event: result.event,
      }));
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

  static async getLifecycleEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const result = await AssetLifecycleService.getAssetLifecycleEvents(req.params.id as string, page, limit);

      return res.status(200).json(
        successResponse('Asset lifecycle events retrieved successfully', result.events, {
          assetId: result.assetId,
          assetTag: result.assetTag,
          currentState: result.currentState,
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

  static async getValidTransitions(req: Request, res: Response, next: NextFunction) {
    try {
      const currentState = (req.query.state as string) || Object.values(AssetLifecycleState)[0];

      if (!Object.values(AssetLifecycleState).includes(currentState as any)) {
        const validStates = Object.values(AssetLifecycleState).join(', ');
        return res.status(400).json(
          errorResponse('Validation failed', validationError('state', `State must be one of: ${validStates}`))
        );
      }

      const validTransitions = AssetLifecycleService.getValidTransitions(currentState as AssetLifecycleState);

      return res.status(200).json(
        successResponse('Valid lifecycle transitions retrieved', validTransitions, {
          currentState,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

export default AssetLifecycleController;
