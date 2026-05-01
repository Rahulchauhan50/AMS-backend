import { Asset } from '../assets/asset.model';
import { Assignment } from '../assignments/assignment.model';
import { MaintenanceRequest } from '../maintenance-requests/maintenance-request.model';

export class AnalyticsService {
  /**
   * Get dashboard metrics overview
   */
  static async getDashboardMetrics(): Promise<Record<string, any>> {
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Total assets
    const totalAssets = await Asset.countDocuments({ isDeleted: false });

    // Assigned assets
    const assignedAssets = await Assignment.countDocuments({
      isDeleted: false,
      assignedToEmployeeId: { $exists: true, $ne: null },
    });

    // Available assets (not assigned)
    const availableAssets = totalAssets - assignedAssets;

    // Active maintenance requests
    const activeMaintenanceRequests = await MaintenanceRequest.countDocuments({
      isDeleted: false,
      completionDate: null,
    });

    // Total asset value
    const costAggregate = await Asset.aggregate([
      { $match: { isDeleted: false, cost: { $exists: true } } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$cost' },
        },
      },
    ]);
    const totalAssetValue = costAggregate.length > 0 ? costAggregate[0].totalValue : 0;

    // Expiring warranties (within 90 days)
    const expiringWarranties = await Asset.countDocuments({
      isDeleted: false,
      warrantyDate: { $gte: today, $lte: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) },
    });

    // Assets by category
    const assetsByCategory = await Asset.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Assets by status
    const assetsByStatus = await Asset.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$statusId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return {
      totalAssets,
      assignedAssets,
      availableAssets,
      activeMaintenanceRequests,
      totalAssetValue,
      expiringWarranties,
      assetsByCategory,
      assetsByStatus,
      generatedAt: new Date(),
    };
  }

  /**
   * Get assets grouped by category with counts and value
   */
  static async getAssetsByCategory(): Promise<Record<string, any>> {
    const categoryData = await Asset.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          totalValue: { $sum: '$cost' },
          averageValue: { $avg: '$cost' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Add category names via lookup
    const withCategoryNames = await Promise.all(
      categoryData.map(async (item: any) => {
        const category = await Asset.findOne({ categoryId: item._id })
          .populate('categoryId', ['categoryName'])
          .lean()
          .exec();
        return {
          categoryId: item._id,
          categoryName: category?.categoryId ? (category.categoryId as any).categoryName : 'Unknown',
          count: item.count,
          totalValue: item.totalValue,
          averageValue: item.averageValue,
        };
      })
    );

    return {
      data: withCategoryNames,
      totalCategories: withCategoryNames.length,
      generatedAt: new Date(),
    };
  }

  /**
   * Get assets grouped by status with counts and value
   */
  static async getAssetsByStatus(): Promise<Record<string, any>> {
    const statusData = await Asset.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$statusId',
          count: { $sum: 1 },
          totalValue: { $sum: '$cost' },
          averageValue: { $avg: '$cost' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Add status names via lookup
    const withStatusNames = await Promise.all(
      statusData.map(async (item: any) => {
        const asset = await Asset.findOne({ statusId: item._id })
          .populate('statusId', ['statusName'])
          .lean()
          .exec();
        return {
          statusId: item._id,
          statusName: asset?.statusId ? (asset.statusId as any).statusName : 'Unknown',
          count: item.count,
          totalValue: item.totalValue,
          averageValue: item.averageValue,
        };
      })
    );

    return {
      data: withStatusNames,
      totalStatuses: withStatusNames.length,
      generatedAt: new Date(),
    };
  }

  /**
   * Get maintenance request trends over time
   */
  static async getMaintenanceTrends(): Promise<Record<string, any>> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Maintenance requests by month
    const monthlyTrends = await MaintenanceRequest.aggregate([
      {
        $match: {
          isDeleted: false,
          requestDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$requestDate' },
            month: { $month: '$requestDate' },
          },
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: ['$completionDate', 1, 0],
            },
          },
          averageResolutionTime: { $avg: '$resolutionTime' },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]);

    // Maintenance by priority
    const byPriority = await MaintenanceRequest.aggregate([
      { $match: { isDeleted: false, requestDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: ['$completionDate', 1, 0],
            },
          },
        },
      },
    ]);

    return {
      monthlyTrends,
      byPriority,
      period: '6 months',
      generatedAt: new Date(),
    };
  }

  /**
   * Get depreciation trends over time
   */
  static async getDepreciationTrends(): Promise<Record<string, any>> {
    // Current depreciation statistics
    const current = await Asset.aggregate([
      { $match: { isDeleted: false, cost: { $exists: true } } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' },
          totalAccumulatedDepreciation: { $sum: '$accumulatedDepreciation' },
          totalBookValue: { $sum: '$currentBookValue' },
          assetCount: { $sum: 1 },
        },
      },
    ]);

    // Assets by depreciation method
    const byMethod = await Asset.aggregate([
      { $match: { isDeleted: false, depreciationMethod: { $exists: true } } },
      {
        $group: {
          _id: '$depreciationMethod',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          totalAccumulatedDepreciation: { $sum: '$accumulatedDepreciation' },
          totalBookValue: { $sum: '$currentBookValue' },
          averageBookValue: { $avg: '$currentBookValue' },
        },
      },
    ]);

    // Depreciation by category
    const byCategory = await Asset.aggregate([
      { $match: { isDeleted: false, cost: { $exists: true } } },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          totalAccumulatedDepreciation: { $sum: '$accumulatedDepreciation' },
          totalBookValue: { $sum: '$currentBookValue' },
        },
      },
      { $sort: { totalCost: -1 } },
      { $limit: 10 },
    ]);

    return {
      current: current.length > 0 ? current[0] : { totalCost: 0, totalBookValue: 0, assetCount: 0 },
      byMethod,
      byCategory,
      generatedAt: new Date(),
    };
  }
}
