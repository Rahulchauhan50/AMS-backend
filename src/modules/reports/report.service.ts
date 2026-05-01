import { Asset } from '../assets/asset.model';
import { Employee } from '../employees/employee.model';
import { Assignment } from '../assignments/assignment.model';
import { MaintenanceRequest } from '../maintenance-requests/maintenance-request.model';

export class ReportService {
  /**
   * Generate asset report with aggregated statistics
   */
  static async getAssetReport(filters?: {
    categoryId?: string;
    statusId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Record<string, any>> {
    const query: any = { isDeleted: false };

    if (filters?.categoryId) query.categoryId = filters.categoryId;
    if (filters?.statusId) query.statusId = filters.statusId;
    if (filters?.startDate || filters?.endDate) {
      query.purchaseDate = {};
      if (filters?.startDate) query.purchaseDate.$gte = filters.startDate;
      if (filters?.endDate) query.purchaseDate.$lte = filters.endDate;
    }

    const limit = filters?.limit || 100;

    // Get summary statistics
    const summary = await Asset.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAssets: { $sum: 1 },
          totalValue: { $sum: '$cost' },
          averageValue: { $avg: '$cost' },
          minValue: { $min: '$cost' },
          maxValue: { $max: '$cost' },
        },
      },
    ]);

    // Get assets by category
    const byCategory = await Asset.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          value: { $sum: '$cost' },
          averageValue: { $avg: '$cost' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get assets by status
    const byStatus = await Asset.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$statusId',
          count: { $sum: 1 },
          value: { $sum: '$cost' },
          averageValue: { $avg: '$cost' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get detailed asset list
    const assets = await Asset.find(query)
      .select(['assetTag', 'name', 'categoryId', 'statusId', 'cost', 'purchaseDate', 'warrantyDate'])
      .limit(limit)
      .lean()
      .exec();

    return {
      summary: summary.length > 0 ? summary[0] : { totalAssets: 0, totalValue: 0, averageValue: 0 },
      byCategory,
      byStatus,
      assets,
      generatedAt: new Date(),
      rowCount: assets.length,
    };
  }

  /**
   * Generate employee report with asset assignments
   */
  static async getEmployeeReport(filters?: {
    departmentId?: string;
    limit?: number;
  }): Promise<Record<string, any>> {
    const query: any = { isDeleted: false };

    if (filters?.departmentId) query.departmentId = filters.departmentId;

    const limit = filters?.limit || 100;

    // Get employee summary
    const summary = await Employee.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
        },
      },
    ]);

    // Get employees with their assigned assets
    const employees = await Employee.find(query)
      .select(['employeeId', 'firstName', 'lastName', 'email', 'departmentId', 'designation'])
      .limit(limit)
      .lean()
      .exec();

    // Get asset counts per employee
    const assetCounts = await Assignment.aggregate([
      { $match: { isDeleted: false, assignedToEmployeeId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$assignedToEmployeeId',
          assetCount: { $sum: 1 },
          totalAssetValue: {
            $sum: {
              $cond: ['$assetId', 1, 0],
            },
          },
        },
      },
    ]);

    // Map asset counts to employees
    const assetCountMap = new Map(assetCounts.map((ac: any) => [ac._id.toString(), ac.assetCount]));

    const employeesWithAssets = employees.map(emp => ({
      ...emp,
      assignedAssetCount: assetCountMap.get(emp._id?.toString()) || 0,
    }));

    return {
      summary: summary.length > 0 ? summary[0] : { totalEmployees: 0 },
      employees: employeesWithAssets,
      generatedAt: new Date(),
      rowCount: employeesWithAssets.length,
    };
  }

  /**
   * Generate assignment report with current and historical assignments
   */
  static async getAssignmentReport(filters?: {
    assetId?: string;
    employeeId?: string;
    assignmentType?: 'employee' | 'room';
    limit?: number;
  }): Promise<Record<string, any>> {
    const query: any = { isDeleted: false };

    if (filters?.assetId) query.assetId = filters.assetId;
    if (filters?.employeeId) query.assignedToEmployeeId = filters.employeeId;
    if (filters?.assignmentType === 'room') query.assignedToRoomId = { $exists: true, $ne: null };
    if (filters?.assignmentType === 'employee') query.assignedToEmployeeId = { $exists: true, $ne: null };

    const limit = filters?.limit || 100;

    // Get assignment summary
    const summary = await Assignment.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalAssignments: { $sum: 1 },
          toEmployees: {
            $sum: {
              $cond: ['$assignedToEmployeeId', 1, 0],
            },
          },
          toRooms: {
            $sum: {
              $cond: ['$assignedToRoomId', 1, 0],
            },
          },
        },
      },
    ]);

    // Get detailed assignments
    const assignments = await Assignment.find(query)
      .select(['assetId', 'assignedToEmployeeId', 'assignedToRoomId', 'assignedDate', 'assignedBy'])
      .populate('assetId', ['assetTag', 'name'])
      .populate('assignedToEmployeeId', ['firstName', 'lastName', 'email'])
      .populate('assignedToRoomId', ['roomName', 'roomType'])
      .limit(limit)
      .lean()
      .exec();

    return {
      summary: summary.length > 0 ? summary[0] : { totalAssignments: 0, toEmployees: 0, toRooms: 0 },
      assignments,
      generatedAt: new Date(),
      rowCount: assignments.length,
    };
  }

  /**
   * Generate maintenance report with request statistics
   */
  static async getMaintenanceReport(filters?: {
    statusId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Record<string, any>> {
    const query: any = { isDeleted: false };

    if (filters?.statusId) query.statusId = filters.statusId;
    if (filters?.startDate || filters?.endDate) {
      query.requestDate = {};
      if (filters?.startDate) query.requestDate.$gte = filters.startDate;
      if (filters?.endDate) query.requestDate.$lte = filters.endDate;
    }

    const limit = filters?.limit || 100;

    // Get maintenance summary
    const summary = await MaintenanceRequest.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          avgResolutionTime: { $avg: '$resolutionTime' },
          completed: {
            $sum: {
              $cond: ['$completionDate', 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $not: '$completionDate' }, 1, 0],
            },
          },
        },
      },
    ]);

    // Get requests by priority
    const byPriority = await MaintenanceRequest.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          avgResolutionTime: { $avg: '$resolutionTime' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get detailed maintenance requests
    const requests = await MaintenanceRequest.find(query)
      .select(['assetId', 'description', 'priority', 'requestDate', 'completionDate', 'resolutionTime', 'cost'])
      .populate('assetId', ['assetTag', 'name'])
      .limit(limit)
      .lean()
      .exec();

    return {
      summary: summary.length > 0 ? summary[0] : { totalRequests: 0, completed: 0, pending: 0 },
      byPriority,
      requests,
      generatedAt: new Date(),
      rowCount: requests.length,
    };
  }

  /**
   * Generate warranty report with expiring warranties
   */
  static async getWarrantyReport(filters?: {
    statusId?: string;
    expiringWithinDays?: number;
    limit?: number;
  }): Promise<Record<string, any>> {
    const expiringDays = filters?.expiringWithinDays || 90;
    const today = new Date();
    const futureDate = new Date(today.getTime() + expiringDays * 24 * 60 * 60 * 1000);

    // Get warranty summary from assets
    const summary = await Asset.aggregate([
      { $match: { isDeleted: false, warrantyDate: { $exists: true } } },
      {
        $group: {
          _id: null,
          totalWithWarranty: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $gt: ['$warrantyDate', today] }, 1, 0],
            },
          },
          expired: {
            $sum: {
              $cond: [{ $lte: ['$warrantyDate', today] }, 1, 0],
            },
          },
          expiringsoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$warrantyDate', futureDate] },
                    { $gt: ['$warrantyDate', today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Get expiring warranties
    const expiringWarranties = await Asset.find({
      isDeleted: false,
      warrantyDate: { $gte: today, $lte: futureDate },
    })
      .select(['assetTag', 'name', 'warrantyDate', 'warrantyExtendedUntil', 'cost', 'vendorId'])
      .populate('vendorId', ['vendorName', 'email'])
      .sort({ warrantyDate: 1 })
      .limit(filters?.limit || 50)
      .lean()
      .exec();

    // Get all assets with warranty
    const allWarranties = await Asset.find({ isDeleted: false, warrantyDate: { $exists: true } })
      .select(['assetTag', 'name', 'warrantyDate', 'warrantyExtendedUntil', 'cost', 'vendorId'])
      .populate('vendorId', ['vendorName'])
      .sort({ warrantyDate: -1 })
      .limit(filters?.limit || 100)
      .lean()
      .exec();

    return {
      summary: summary.length > 0 ? summary[0] : { totalWithWarranty: 0, active: 0, expired: 0, expiringsoon: 0 },
      expiringWarranties,
      allWarranties,
      generatedAt: new Date(),
      expiringWithinDays: expiringDays,
    };
  }

  /**
   * Generate depreciation report with financial summaries
   */
  static async getDepreciationReport(filters?: {
    categoryId?: string;
    limit?: number;
  }): Promise<Record<string, any>> {
    const query: any = { isDeleted: false, cost: { $exists: true } };

    if (filters?.categoryId) query.categoryId = filters.categoryId;

    // Get depreciation summary
    const summary = await Asset.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAssets: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          totalAccumulatedDepreciation: { $sum: '$accumulatedDepreciation' },
          totalBookValue: { $sum: '$currentBookValue' },
          totalSalvageValue: { $sum: '$salvageValue' },
          averageBookValue: { $avg: '$currentBookValue' },
        },
      },
    ]);

    // Get depreciation by method
    const byMethod = await Asset.aggregate([
      { $match: query },
      { $match: { depreciationMethod: { $exists: true } } },
      {
        $group: {
          _id: '$depreciationMethod',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          totalBookValue: { $sum: '$currentBookValue' },
          averageBookValue: { $avg: '$currentBookValue' },
        },
      },
    ]);

    // Get depreciation by category
    const byCategory = await Asset.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          totalBookValue: { $sum: '$currentBookValue' },
          totalAccumulatedDepreciation: { $sum: '$accumulatedDepreciation' },
        },
      },
    ]);

    // Get detailed asset finance list
    const assetFinances = await Asset.find(query)
      .select([
        'assetTag',
        'name',
        'cost',
        'currentBookValue',
        'salvageValue',
        'depreciationMethod',
        'usefulLifeYears',
        'accumulatedDepreciation',
      ])
      .limit(filters?.limit || 100)
      .lean()
      .exec();

    return {
      summary: summary.length > 0 ? summary[0] : { totalAssets: 0, totalCost: 0, totalBookValue: 0 },
      byMethod,
      byCategory,
      assetFinances,
      generatedAt: new Date(),
      rowCount: assetFinances.length,
    };
  }
}
