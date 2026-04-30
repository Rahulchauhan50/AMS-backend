import { Asset } from './asset.model';
import { AssetLifecycleEvent, type IAssetLifecycleEvent } from './asset-lifecycle.model';
import { AssetLifecycleState } from '../../common/enums';

// Define valid state transitions
const VALID_TRANSITIONS: Record<AssetLifecycleState, AssetLifecycleState[]> = {
  [AssetLifecycleState.REQUESTED]: [AssetLifecycleState.PURCHASED],
  [AssetLifecycleState.PURCHASED]: [AssetLifecycleState.RECEIVED],
  [AssetLifecycleState.RECEIVED]: [AssetLifecycleState.AVAILABLE],
  [AssetLifecycleState.AVAILABLE]: [AssetLifecycleState.ASSIGNED, AssetLifecycleState.MAINTENANCE, AssetLifecycleState.LOST],
  [AssetLifecycleState.ASSIGNED]: [AssetLifecycleState.AVAILABLE, AssetLifecycleState.MAINTENANCE, AssetLifecycleState.LOST],
  [AssetLifecycleState.MAINTENANCE]: [AssetLifecycleState.AVAILABLE, AssetLifecycleState.RETIRED, AssetLifecycleState.LOST],
  [AssetLifecycleState.RETIRED]: [AssetLifecycleState.DISPOSED],
  [AssetLifecycleState.DISPOSED]: [],
  [AssetLifecycleState.LOST]: [],
};

interface AssetWithLifecycle {
  lifecycleState?: AssetLifecycleState;
}

export class AssetLifecycleService {
  static isValidTransition(currentState: AssetLifecycleState, newState: AssetLifecycleState): boolean {
    return VALID_TRANSITIONS[currentState]?.includes(newState) || false;
  }

  static async transitionAsset(assetId: string, newState: AssetLifecycleState, performedBy?: string, reason?: string) {
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    const currentState = ((asset.lifecycleState as any) || AssetLifecycleState.AVAILABLE) as AssetLifecycleState;

    if (currentState === newState) {
      const error = new Error('Asset is already in this state');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'newState', message: 'Target state is the same as current state' }];
      throw error;
    }

    if (!this.isValidTransition(currentState, newState)) {
      const error = new Error('Invalid lifecycle transition');
      (error as any).statusCode = 400;
      (error as any).errors = [
        {
          field: 'newState',
          message: `Cannot transition from ${currentState} to ${newState}. Valid transitions: ${VALID_TRANSITIONS[currentState]?.join(', ') || 'none'}`,
        },
      ];
      throw error;
    }

    // Create lifecycle event
    const event = await AssetLifecycleEvent.create({
      assetId,
      oldState: currentState,
      newState,
      reason: reason || '',
      performedBy: performedBy || '',
    });

    // Update asset lifecycle state
    (asset as AssetWithLifecycle).lifecycleState = newState;
    await asset.save();

    return {
      asset: asset.populate(['categoryId', 'statusId', 'vendorId', 'locationId', 'roomId']),
      event,
    };
  }

  static async getAssetLifecycleEvents(assetId: string, page: number = 1, limit: number = 20) {
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    const events = await AssetLifecycleEvent.find({ assetId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await AssetLifecycleEvent.countDocuments({ assetId, isDeleted: false });

    return {
      assetId,
      assetTag: asset.assetTag,
      currentState: (asset.lifecycleState as any) || AssetLifecycleState.AVAILABLE,
      events,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static getValidTransitions(currentState: AssetLifecycleState): AssetLifecycleState[] {
    return VALID_TRANSITIONS[currentState] || [];
  }
}

export default AssetLifecycleService;
