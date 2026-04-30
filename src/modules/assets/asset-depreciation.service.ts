import { Asset, type IAsset } from './asset.model';
import { AssetDepreciationMethod } from '../../common/enums';
import { AssetDepreciation, type IAssetDepreciation, type IDepreciationScheduleEntry } from './asset-depreciation.model';

type RecordDepreciationInput = {
  salvageValue?: number;
  usefulLifeYears?: number;
  depreciationMethod?: string;
  depreciationStartDate?: Date;
};

const clampMoney = (value: number) => Math.max(0, Number(value || 0));

const buildStraightLineSchedule = (
  purchaseCost: number,
  salvageValue: number,
  usefulLifeYears: number,
  startDate: Date,
  asOfDate: Date
) => {
  const depreciableBase = Math.max(0, purchaseCost - salvageValue);
  const annualDepreciation = usefulLifeYears > 0 ? depreciableBase / usefulLifeYears : 0;
  const monthlyDepreciation = annualDepreciation / 12;
  const schedule: IDepreciationScheduleEntry[] = [];

  let accumulatedDepreciation = 0;
  for (let period = 1; period <= usefulLifeYears; period += 1) {
    const depreciation = Math.min(annualDepreciation, purchaseCost - salvageValue - accumulatedDepreciation);
    accumulatedDepreciation += depreciation;
    const bookValue = Math.max(salvageValue, purchaseCost - accumulatedDepreciation);
    const periodDate = new Date(startDate);
    periodDate.setFullYear(periodDate.getFullYear() + period);

    schedule.push({
      period,
      depreciation,
      accumulatedDepreciation,
      bookValue,
      periodDate,
    });
  }

  const elapsedYears = Math.max(0, (asOfDate.getTime() - startDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
  const periodsElapsed = Math.min(usefulLifeYears, Math.max(0, elapsedYears));
  const accumulatedAtAsOf = Math.min(depreciableBase, annualDepreciation * periodsElapsed);
  const currentBookValue = Math.max(salvageValue, purchaseCost - accumulatedAtAsOf);

  return {
    schedule,
    annualDepreciation,
    monthlyDepreciation,
    accumulatedDepreciation: accumulatedAtAsOf,
    currentBookValue,
  };
};

export class AssetDepreciationService {
  static async recordDepreciation(assetId: string, input: RecordDepreciationInput) {
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    const purchaseCost = clampMoney(asset.cost || 0);
    const salvageValue = clampMoney(input.salvageValue ?? asset.salvageValue ?? 0);
    const usefulLifeYears = Math.max(1, Number(input.usefulLifeYears ?? asset.usefulLifeYears ?? 1));
    const depreciationMethod = (input.depreciationMethod || asset.depreciationMethod || AssetDepreciationMethod.STRAIGHT_LINE) as AssetDepreciationMethod;
    const depreciationStartDate = input.depreciationStartDate || asset.depreciationStartDate || asset.purchaseDate || new Date();

    if (depreciationMethod !== AssetDepreciationMethod.STRAIGHT_LINE) {
      const error = new Error('Unsupported depreciation method');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'depreciationMethod', message: 'Only STRAIGHT_LINE is supported' }];
      throw error;
    }

    if (salvageValue > purchaseCost) {
      const error = new Error('Salvage value must not exceed purchase cost');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'salvageValue', message: 'Salvage value cannot be greater than purchase cost' }];
      throw error;
    }

    const asOfDate = new Date();
    const result = buildStraightLineSchedule(purchaseCost, salvageValue, usefulLifeYears, depreciationStartDate, asOfDate);

    asset.salvageValue = salvageValue;
    asset.usefulLifeYears = usefulLifeYears;
    asset.depreciationMethod = depreciationMethod;
    asset.depreciationStartDate = depreciationStartDate;
    asset.accumulatedDepreciation = result.accumulatedDepreciation;
    asset.currentBookValue = result.currentBookValue;
    await asset.save();

    const record = await AssetDepreciation.create({
      assetId,
      purchaseCost,
      salvageValue,
      usefulLifeYears,
      depreciationMethod,
      depreciationStartDate,
      annualDepreciation: result.annualDepreciation,
      monthlyDepreciation: result.monthlyDepreciation,
      accumulatedDepreciation: result.accumulatedDepreciation,
      currentBookValue: result.currentBookValue,
      schedule: result.schedule,
      asOfDate,
    });

    return { asset, record };
  }

  static async getDepreciationHistory(assetId: string) {
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    const records = await AssetDepreciation.find({ assetId, isDeleted: false }).sort({ asOfDate: -1 });
    return {
      assetId,
      assetTag: asset.assetTag,
      currentBookValue: asset.currentBookValue || 0,
      records,
      total: records.length,
    };
  }

  static async getDepreciationSummary() {
    const assets = await Asset.find({ isDeleted: false, cost: { $gt: 0 } });

    let totalPurchaseValue = 0;
    let totalAccumulatedDepreciation = 0;
    let totalCurrentBookValue = 0;
    let totalSalvageValue = 0;
    let depreciatedAssets = 0;

    for (const asset of assets as Array<IAsset & { salvageValue?: number; accumulatedDepreciation?: number; currentBookValue?: number }>) {
      totalPurchaseValue += Number(asset.cost || 0);
      totalSalvageValue += Number(asset.salvageValue || 0);
      totalAccumulatedDepreciation += Number(asset.accumulatedDepreciation || 0);
      totalCurrentBookValue += Number(asset.currentBookValue || Math.max(0, Number(asset.cost || 0) - Number(asset.accumulatedDepreciation || 0)));
      if ((asset.usefulLifeYears || 0) > 0) {
        depreciatedAssets += 1;
      }
    }

    return {
      totalAssets: assets.length,
      depreciatedAssets,
      totalPurchaseValue,
      totalSalvageValue,
      totalAccumulatedDepreciation,
      totalCurrentBookValue,
    };
  }

  static async getAssetValueSummary() {
    const assets = await Asset.find({ isDeleted: false });

    let totalPurchaseValue = 0;
    let totalCurrentBookValue = 0;
    let totalDepreciableValue = 0;

    for (const asset of assets as Array<IAsset & { salvageValue?: number; accumulatedDepreciation?: number; currentBookValue?: number }>) {
      const purchaseValue = Number(asset.cost || 0);
      const salvageValue = Number(asset.salvageValue || 0);
      const currentBookValue = Number(asset.currentBookValue || Math.max(0, purchaseValue - Number(asset.accumulatedDepreciation || 0)));

      totalPurchaseValue += purchaseValue;
      totalCurrentBookValue += currentBookValue;
      totalDepreciableValue += Math.max(0, purchaseValue - salvageValue);
    }

    return {
      totalAssets: assets.length,
      totalPurchaseValue,
      totalDepreciableValue,
      totalCurrentBookValue,
    };
  }
}

export default AssetDepreciationService;