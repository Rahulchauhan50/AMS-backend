import { Contract, IContract } from './contract.model';
import { Vendor } from '../vendors/vendor.model';
import { Asset } from '../assets/asset.model';
import { ContractStatus } from '../../common/enums';

export class ContractService {
  /**
   * Create a new contract
   */
  static async createContract(data: {
    contractNumber: string;
    contractType: string;
    vendorId: string;
    assetIds?: string[];
    startDate: Date;
    endDate: Date;
    renewalDate?: Date;
    amount?: number;
    currency?: string;
    description?: string;
    terms?: string;
    renewalReminder?: number;
    isAutoRenewal?: boolean;
  }): Promise<IContract> {
    // Validate vendor exists
    const vendor = await Vendor.findById(data.vendorId);
    if (!vendor || vendor.isDeleted) {
      const error = new Error('Vendor not found') as any;
      error.statusCode = 404;
      error.errors = ['Referenced vendor does not exist'];
      throw error;
    }

    // Validate assets exist if provided
    if (data.assetIds && data.assetIds.length > 0) {
      const assets = await Asset.find({ _id: { $in: data.assetIds }, isDeleted: false });
      if (assets.length !== data.assetIds.length) {
        const error = new Error('Some assets not found') as any;
        error.statusCode = 404;
        error.errors = ['One or more referenced assets do not exist'];
        throw error;
      }
    }

    // Validate dates
    if (data.startDate >= data.endDate) {
      const error = new Error('Invalid dates') as any;
      error.statusCode = 400;
      error.errors = ['Start date must be before end date'];
      throw error;
    }

    const contract = new Contract({
      ...data,
      status: ContractStatus.ACTIVE,
      assetIds: data.assetIds || [],
    });

    return await contract.save();
  }

  /**
   * Get contract by ID with populated references
   */
  static async getContractById(id: string): Promise<IContract | null> {
    return await Contract.findById(id)
      .populate('vendorId')
      .populate('assetIds')
      .exec();
  }

  /**
   * List all contracts with pagination
   */
  static async listContracts(
    page: number = 1,
    limit: number = 10,
    filters?: { vendorId?: string; status?: string; contractType?: string }
  ): Promise<{ contracts: IContract[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    if (filters?.vendorId) query.vendorId = filters.vendorId;
    if (filters?.status) query.status = filters.status;
    if (filters?.contractType) query.contractType = filters.contractType;

    const [contracts, total] = await Promise.all([
      Contract.find(query)
        .populate('vendorId')
        .populate('assetIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Contract.countDocuments(query),
    ]);

    return {
      contracts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get expiring contracts (within renewal reminder days)
   */
  static async getExpiringContracts(daysThreshold?: number): Promise<IContract[]> {
    const now = new Date();
    const future = new Date(now.getTime() + (daysThreshold || 30) * 24 * 60 * 60 * 1000);

    return await Contract.find({
      isDeleted: false,
      status: ContractStatus.ACTIVE,
      endDate: { $gte: now, $lte: future },
    })
      .populate('vendorId')
      .populate('assetIds')
      .sort({ endDate: 1 })
      .exec();
  }

  /**
   * Update contract
   */
  static async updateContract(
    id: string,
    data: Partial<{
      contractType?: string;
      status?: string;
      vendorId?: string;
      assetIds?: string[];
      startDate?: Date;
      endDate?: Date;
      renewalDate?: Date;
      amount?: number;
      currency?: string;
      description?: string;
      terms?: string;
      renewalReminder?: number;
      isAutoRenewal?: boolean;
    }>
  ): Promise<IContract | null> {
    // Validate vendor if being updated
    if (data.vendorId) {
      const vendor = await Vendor.findById(data.vendorId);
      if (!vendor || vendor.isDeleted) {
        const error = new Error('Vendor not found') as any;
        error.statusCode = 404;
        error.errors = ['Referenced vendor does not exist'];
        throw error;
      }
    }

    // Validate assets if being updated
    if (data.assetIds) {
      const assets = await Asset.find({ _id: { $in: data.assetIds }, isDeleted: false });
      if (assets.length !== data.assetIds.length) {
        const error = new Error('Some assets not found') as any;
        error.statusCode = 404;
        error.errors = ['One or more referenced assets do not exist'];
        throw error;
      }
    }

    // Validate dates if being updated
    if ((data.startDate || data.endDate) && data.startDate && data.endDate) {
      if (data.startDate >= data.endDate) {
        const error = new Error('Invalid dates') as any;
        error.statusCode = 400;
        error.errors = ['Start date must be before end date'];
        throw error;
      }
    }

    return await Contract.findByIdAndUpdate(id, data, { new: true })
      .populate('vendorId')
      .populate('assetIds')
      .exec();
  }

  /**
   * Soft delete contract
   */
  static async deleteContract(id: string): Promise<IContract | null> {
    return await Contract.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    )
      .populate('vendorId')
      .populate('assetIds')
      .exec();
  }

  /**
   * Get contracts by vendor
   */
  static async getContractsByVendor(vendorId: string): Promise<IContract[]> {
    return await Contract.find({ vendorId, isDeleted: false })
      .populate('vendorId')
      .populate('assetIds')
      .sort({ endDate: 1 })
      .exec();
  }

  /**
   * Get contracts for a specific asset
   */
  static async getContractsByAsset(assetId: string): Promise<IContract[]> {
    return await Contract.find({ assetIds: assetId, isDeleted: false })
      .populate('vendorId')
      .populate('assetIds')
      .sort({ endDate: 1 })
      .exec();
  }

  /**
   * Get contract summary statistics
   */
  static async getContractSummary(): Promise<{
    totalContracts: number;
    activeContracts: number;
    expiredContracts: number;
    cancelledContracts: number;
    totalValue: number;
  }> {
    const contracts = await Contract.find({ isDeleted: false });
    
    const totalValue = contracts.reduce((sum, contract) => sum + (contract.amount || 0), 0);
    const activeCount = contracts.filter(c => c.status === ContractStatus.ACTIVE).length;
    const expiredCount = contracts.filter(c => c.status === ContractStatus.EXPIRED).length;
    const cancelledCount = contracts.filter(c => c.status === ContractStatus.CANCELLED).length;

    return {
      totalContracts: contracts.length,
      activeContracts: activeCount,
      expiredContracts: expiredCount,
      cancelledContracts: cancelledCount,
      totalValue,
    };
  }
}
