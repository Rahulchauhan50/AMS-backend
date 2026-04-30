import { MaintenanceRequest, type IMaintenanceRequest } from './maintenance-request.model';
import { Asset } from '../assets/asset.model';
import { AssetStatusCode, MaintenanceRequestStatus, MaintenanceRequestPriority } from '../../common/enums';

export class MaintenanceRequestService {
  static async createMaintenanceRequest(
    assetId: string,
    status?: MaintenanceRequestStatus,
    priority?: MaintenanceRequestPriority,
    assignedTechnician?: string,
    assignedVendor?: string,
    cost?: number,
    notes?: string,
    requestedBy?: string
  ) {
    // Validate asset exists
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'assetId', message: 'Asset does not exist' }];
      throw error;
    }

    // Create maintenance request
    const maintenanceRequest = await MaintenanceRequest.create({
      assetId,
      status: status || MaintenanceRequestStatus.PENDING,
      priority: priority || MaintenanceRequestPriority.MEDIUM,
      assignedTechnician: assignedTechnician || '',
      assignedVendor: assignedVendor || '',
      cost: cost || 0,
      notes: notes || '',
      requestedBy: requestedBy || '',
      startDate: status === MaintenanceRequestStatus.IN_PROGRESS ? new Date() : undefined,
    });

    // Update asset status to IN_MAINTENANCE if not already
    if (asset.statusId !== AssetStatusCode.IN_MAINTENANCE) {
      asset.statusId = AssetStatusCode.IN_MAINTENANCE;
      await asset.save();
    }

    return maintenanceRequest;
  }

  static async getMaintenanceRequest(id: string) {
    const request = await MaintenanceRequest.findOne({ _id: id, isDeleted: false });
    if (!request) {
      const error = new Error('Maintenance request not found');
      (error as any).statusCode = 404;
      (error as any).errors = [{ field: 'id', message: 'Maintenance request does not exist' }];
      throw error;
    }
    return request;
  }

  static async listMaintenanceRequests(assetId?: string, status?: MaintenanceRequestStatus, page: number = 1, limit: number = 20) {
    const query: any = { isDeleted: false };

    if (assetId) {
      query.assetId = assetId;
    }

    if (status) {
      query.status = status;
    }

    const requests = await MaintenanceRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await MaintenanceRequest.countDocuments(query);

    return {
      requests,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async updateMaintenanceRequest(
    id: string,
    updates: {
      priority?: MaintenanceRequestPriority;
      assignedTechnician?: string;
      assignedVendor?: string;
      cost?: number;
      notes?: string;
    }
  ) {
    const request = await this.getMaintenanceRequest(id);

    if (updates.priority !== undefined) {
      request.priority = updates.priority;
    }
    if (updates.assignedTechnician !== undefined) {
      request.assignedTechnician = updates.assignedTechnician;
    }
    if (updates.assignedVendor !== undefined) {
      request.assignedVendor = updates.assignedVendor;
    }
    if (updates.cost !== undefined) {
      request.cost = updates.cost;
    }
    if (updates.notes !== undefined) {
      request.notes = updates.notes;
    }

    await request.save();
    return request;
  }

  static async updateMaintenanceStatus(id: string, newStatus: MaintenanceRequestStatus) {
    const request = await this.getMaintenanceRequest(id);

    // Validate status transition
    if (request.status === newStatus) {
      const error = new Error('Request is already in this status');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'status', message: 'Target status is the same as current status' }];
      throw error;
    }

    const validTransitions: Record<MaintenanceRequestStatus, MaintenanceRequestStatus[]> = {
      [MaintenanceRequestStatus.PENDING]: [MaintenanceRequestStatus.IN_PROGRESS, MaintenanceRequestStatus.CANCELLED],
      [MaintenanceRequestStatus.IN_PROGRESS]: [MaintenanceRequestStatus.COMPLETED, MaintenanceRequestStatus.CANCELLED],
      [MaintenanceRequestStatus.COMPLETED]: [],
      [MaintenanceRequestStatus.CANCELLED]: [],
    };

    if (!validTransitions[request.status]?.includes(newStatus)) {
      const error = new Error('Invalid status transition');
      (error as any).statusCode = 400;
      (error as any).errors = [
        {
          field: 'status',
          message: `Cannot transition from ${request.status} to ${newStatus}. Valid transitions: ${validTransitions[request.status]?.join(', ') || 'none'}`,
        },
      ];
      throw error;
    }

    request.status = newStatus;

    if (newStatus === MaintenanceRequestStatus.IN_PROGRESS && !request.startDate) {
      request.startDate = new Date();
    }

    if (newStatus === MaintenanceRequestStatus.COMPLETED) {
      request.completedDate = new Date();
    }

    await request.save();
    return request;
  }
}

export default MaintenanceRequestService;
