import { Assignment, type IAssignment } from './assignment.model';
import { AssetService } from '../assets/asset.service';
import { Employee } from '../employees/employee.model';
import { AssetStatusCode } from '../../common/enums';

interface AssignInput {
  assetId: string;
  employeeId: string;
  performedBy?: string;
  reason?: string;
}

export class AssignmentService {
  static async assignToEmployee(assetId: string, employeeId: string, performedBy?: string, reason?: string) {
    // Ensure asset exists
    const asset = await AssetService.getAssetById(assetId);

    // Check if asset is in maintenance
    if (asset.statusId === AssetStatusCode.IN_MAINTENANCE) {
      const error = new Error('Asset is under maintenance');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'assetId', message: 'Cannot assign asset that is currently under maintenance' }];
      throw error;
    }

    // Ensure employee exists
    const employee = await Employee.findOne({ _id: employeeId, isDeleted: false });
    if (!employee) {
      const error = new Error('Employee not found');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'employeeId', message: 'Employee does not exist' }];
      throw error;
    }

    // Check availability (no active assignment)
    const active = await Assignment.findOne({ assetId, isActive: true, isDeleted: false });
    if (active) {
      const error = new Error('Asset already assigned');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'assetId', message: 'Asset is already assigned to an employee' }];
      throw error;
    }

    const assignment = await Assignment.create({
      assetId,
      employeeId,
      assignedAt: new Date(),
      assignedBy: performedBy || '',
      reason: reason || '',
      isActive: true,
    });

    return assignment.populate(['assetId', 'employeeId']);
  }

  static async unassignAsset(assetId: string, performedBy?: string) {
    const active = await Assignment.findOne({ assetId, isActive: true, isDeleted: false });
    if (!active) {
      const error = new Error('No active assignment found');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'assetId', message: 'Asset is not currently assigned' }];
      throw error;
    }

    active.unassignedAt = new Date();
    active.unassignedBy = performedBy || '';
    active.isActive = false;

    await active.save();
    return active.populate(['assetId', 'employeeId']);
  }

  static async reassignToEmployee(assetId: string, newEmployeeId: string, performedBy?: string, reason?: string) {
    // Unassign current
    const active = await Assignment.findOne({ assetId, isActive: true, isDeleted: false });
    if (active) {
      active.unassignedAt = new Date();
      active.unassignedBy = performedBy || '';
      active.isActive = false;
      await active.save();
    }

    // Create new assignment
    return this.assignToEmployee(assetId, newEmployeeId, performedBy, reason);
  }

  static async listAssignments(filters?: { employeeId?: string; assetId?: string; isActive?: boolean }, page = 1, limit = 20) {
    const query: any = { isDeleted: false };
    if (filters?.employeeId) query.employeeId = filters.employeeId;
    if (filters?.assetId) query.assetId = filters.assetId;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;

    const assignments = await Assignment.find(query)
      .populate(['assetId', 'employeeId'])
      .sort({ assignedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Assignment.countDocuments(query);
    return { assignments, total };
  }
}

export default AssignmentService;
