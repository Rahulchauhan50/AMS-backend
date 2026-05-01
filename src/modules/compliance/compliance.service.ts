import { CompliancePolicy, ICompliancePolicy } from './compliance-policy.model';
import { ComplianceResult, IComplianceResult } from './compliance-result.model';
import { Asset } from '../assets/asset.model';
import { Document } from '../documents/document.model';
import { Contract } from '../contracts/contract.model';
import { AssetCategory } from '../asset-categories/asset-category.model';
import { ContractStatus } from '../../common/enums';

export class CompliancePolicyService {
  /**
   * Create a new compliance policy
   */
  static async createPolicy(data: {
    name: string;
    description?: string;
    severity: string;
    categoryIds?: string[];
    checks: {
      checkType: string;
      parameters?: Record<string, any>;
    }[];
    enabled?: boolean;
  }): Promise<ICompliancePolicy> {
    // Validate categories exist if provided
    if (data.categoryIds && data.categoryIds.length > 0) {
      const categories = await AssetCategory.find({ _id: { $in: data.categoryIds }, isDeleted: false });
      if (categories.length !== data.categoryIds.length) {
        const error = new Error('Some categories not found') as any;
        error.statusCode = 404;
        error.errors = ['One or more referenced categories do not exist'];
        throw error;
      }
    }

    const policy = new CompliancePolicy({
      ...data,
      categoryIds: data.categoryIds || [],
      enabled: data.enabled !== false,
    });

    return await policy.save();
  }

  /**
   * Get policy by ID
   */
  static async getPolicyById(id: string): Promise<ICompliancePolicy | null> {
    return await CompliancePolicy.findById(id).exec();
  }

  /**
   * List all policies
   */
  static async listPolicies(
    page: number = 1,
    limit: number = 10
  ): Promise<{ policies: ICompliancePolicy[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    const [policies, total] = await Promise.all([
      CompliancePolicy.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      CompliancePolicy.countDocuments(query),
    ]);

    return {
      policies,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get enabled policies
   */
  static async getEnabledPolicies(): Promise<ICompliancePolicy[]> {
    return await CompliancePolicy.find({ isDeleted: false, enabled: true }).exec();
  }

  /**
   * Update policy
   */
  static async updatePolicy(
    id: string,
    data: Partial<{
      name?: string;
      description?: string;
      severity?: string;
      categoryIds?: string[];
      checks?: {
        checkType: string;
        parameters?: Record<string, any>;
      }[];
      enabled?: boolean;
    }>
  ): Promise<ICompliancePolicy | null> {
    // Validate categories if being updated
    if (data.categoryIds) {
      const categories = await AssetCategory.find({ _id: { $in: data.categoryIds }, isDeleted: false });
      if (categories.length !== data.categoryIds.length) {
        const error = new Error('Some categories not found') as any;
        error.statusCode = 404;
        error.errors = ['One or more referenced categories do not exist'];
        throw error;
      }
    }

    return await CompliancePolicy.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  /**
   * Delete policy (soft delete)
   */
  static async deletePolicy(id: string): Promise<ICompliancePolicy | null> {
    return await CompliancePolicy.findByIdAndUpdate(id, { isDeleted: true }, { new: true }).exec();
  }
}

export class ComplianceCheckService {
  /**
   * Run compliance checks for a specific policy
   */
  static async runPolicyChecks(policyId: string): Promise<IComplianceResult[]> {
    const policy = await CompliancePolicy.findById(policyId);
    if (!policy || policy.isDeleted) {
      const error = new Error('Policy not found') as any;
      error.statusCode = 404;
      error.errors = ['Referenced policy does not exist'];
      throw error;
    }

    // Get assets to check
    let query: any = { isDeleted: false };
    if (policy.categoryIds && policy.categoryIds.length > 0) {
      query.categoryId = { $in: policy.categoryIds };
    }

    const assets = await Asset.find(query).exec();
    const results: IComplianceResult[] = [];

    // Run each check type for each asset
    for (const asset of assets) {
      for (const check of policy.checks) {
        const result = await this.runSingleCheck(asset, policy, check);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Run all enabled policies (comprehensive compliance check)
   */
  static async runAllPolicies(): Promise<IComplianceResult[]> {
    const policies = await CompliancePolicy.find({ isDeleted: false, enabled: true }).exec();
    let allResults: IComplianceResult[] = [];

    for (const policy of policies) {
      const results = await this.runPolicyChecks(policy._id.toString());
      allResults = allResults.concat(results);
    }

    return allResults;
  }

  /**
   * Run a single compliance check
   */
  private static async runSingleCheck(
    asset: any,
    policy: ICompliancePolicy,
    check: { checkType: string; parameters?: Record<string, any> }
  ): Promise<IComplianceResult | null> {
    let status: 'COMPLIANT' | 'NON_COMPLIANT' = 'COMPLIANT';
    let reason = '';
    let details: Record<string, any> = {};

    switch (check.checkType) {
      case 'ASSIGNED_OWNER':
        // Check if asset is assigned to an employee
        if (!asset.assignedToEmployeeId) {
          status = 'NON_COMPLIANT';
          reason = 'Asset is not assigned to any employee';
        }
        break;

      case 'WARRANTY_DOCUMENT':
        // Check if asset has warranty documents attached
        if (asset.warrantyDate) {
          const now = new Date();
          if (asset.warrantyDate < now) {
            status = 'NON_COMPLIANT';
            reason = 'Warranty has expired';
            details = { expiryDate: asset.warrantyDate };
          } else {
            const documents = await Document.countDocuments({
              linkedAssetId: asset._id,
              documentType: 'WARRANTY',
              isDeleted: false,
            });
            if (documents === 0) {
              status = 'NON_COMPLIANT';
              reason = 'Asset has warranty but no warranty documents attached';
            }
          }
        } else {
          status = 'NON_COMPLIANT';
          reason = 'Asset has no warranty information';
        }
        break;

      case 'ACTIVE_CONTRACT':
        // Check if asset has active contracts
        try {
          const contract = await Contract.findOne({
            assetIds: { $in: [asset._id.toString()] },
            status: ContractStatus.ACTIVE,
            isDeleted: false,
          }).exec();
          if (!contract) {
            status = 'NON_COMPLIANT';
            reason = 'Asset has no active maintenance or support contracts';
          } else {
            details = { contractNumber: contract.contractNumber };
          }
        } catch (e) {
          // If contract lookup fails, mark as non-compliant
          status = 'NON_COMPLIANT';
          reason = 'Unable to verify active contracts';
        }
        break;

      case 'VALID_LICENSE':
        // Check if asset has valid license
        if (asset.licenseExpiryDate) {
          const now = new Date();
          if (asset.licenseExpiryDate < now) {
            status = 'NON_COMPLIANT';
            reason = 'License has expired';
            details = { expiryDate: asset.licenseExpiryDate };
          }
        } else if (asset.licenseName) {
          status = 'NON_COMPLIANT';
          reason = 'Asset has license but no expiry date set';
        }
        break;

      default:
        return null;
    }

    // Save the result
    const result = new ComplianceResult({
      policyId: policy._id,
      assetId: asset._id.toString(),
      checkType: check.checkType,
      status,
      severity: policy.severity,
      reason,
      details,
      checkedAt: new Date(),
    });

    return await result.save();
  }

  /**
   * Get compliance results for a policy
   */
  static async getResultsByPolicy(
    policyId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ results: IComplianceResult[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { policyId, isDeleted: false };

    const [results, total] = await Promise.all([
      ComplianceResult.find(query)
        .sort({ checkedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ComplianceResult.countDocuments(query),
    ]);

    return {
      results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get non-compliant results
   */
  static async getNonCompliantResults(
    page: number = 1,
    limit: number = 10
  ): Promise<{ results: IComplianceResult[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { status: 'NON_COMPLIANT', isDeleted: false };

    const [results, total] = await Promise.all([
      ComplianceResult.find(query)
        .populate('policyId')
        .sort({ severity: -1, checkedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ComplianceResult.countDocuments(query),
    ]);

    return {
      results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get compliance summary
   */
  static async getComplianceSummary(): Promise<{
    totalChecks: number;
    compliant: number;
    nonCompliant: number;
    complianceRate: number;
    bySeverity: Record<string, number>;
    byCheckType: Record<string, { total: number; nonCompliant: number }>;
  }> {
    const allResults = await ComplianceResult.find({ isDeleted: false }).exec();

    const compliant = allResults.filter(r => r.status === 'COMPLIANT').length;
    const nonCompliant = allResults.filter(r => r.status === 'NON_COMPLIANT').length;
    const complianceRate = allResults.length > 0 ? (compliant / allResults.length) * 100 : 0;

    // Group by severity
    const bySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    allResults
      .filter(r => r.status === 'NON_COMPLIANT')
      .forEach(r => {
        bySeverity[r.severity]++;
      });

    // Group by check type
    const byCheckType: Record<string, { total: number; nonCompliant: number }> = {
      ASSIGNED_OWNER: { total: 0, nonCompliant: 0 },
      WARRANTY_DOCUMENT: { total: 0, nonCompliant: 0 },
      ACTIVE_CONTRACT: { total: 0, nonCompliant: 0 },
      VALID_LICENSE: { total: 0, nonCompliant: 0 },
    };

    allResults.forEach(r => {
      if (byCheckType[r.checkType]) {
        byCheckType[r.checkType].total++;
        if (r.status === 'NON_COMPLIANT') {
          byCheckType[r.checkType].nonCompliant++;
        }
      }
    });

    return {
      totalChecks: allResults.length,
      compliant,
      nonCompliant,
      complianceRate: Math.round(complianceRate * 100) / 100,
      bySeverity,
      byCheckType,
    };
  }

  /**
   * Delete old compliance results (cleanup)
   */
  static async deleteOldResults(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await ComplianceResult.updateMany(
      { checkedAt: { $lt: cutoffDate }, isDeleted: false },
      { isDeleted: true }
    );

    return result.modifiedCount;
  }
}
