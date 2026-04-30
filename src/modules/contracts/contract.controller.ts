import { Request, Response } from 'express';
import { ContractService } from './contract.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';
import { AuditLogService } from '../audit-logs/audit-log.service';

export const ContractController = {
  /**
   * Create a new contract
   * POST /api/v1/contracts
   */
  async createContract(req: Request, res: Response): Promise<void> {
    try {
      const { contractNumber, contractType, vendorId, assetIds, startDate, endDate, renewalDate, amount, currency, description, terms, renewalReminder, isAutoRenewal } = req.body;

      // Validation
      if (!contractNumber || !contractType || !vendorId || !startDate || !endDate) {
        res.status(400).json(
          errorResponse('Missing required fields', [
            'contractNumber, contractType, vendorId, startDate, and endDate are required',
          ])
        );
        return;
      }

      const contract = await ContractService.createContract({
        contractNumber,
        contractType,
        vendorId,
        assetIds,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        renewalDate: renewalDate ? new Date(renewalDate) : undefined,
        amount,
        currency,
        description,
        terms,
        renewalReminder,
        isAutoRenewal,
      });

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: contract,
      });

      res.status(201).json(successResponse('Contract created successfully', contract));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to create contract';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get contract by ID
   * GET /api/v1/contracts/:id
   */
  async getContractById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      const contract = await ContractService.getContractById(id);

      if (!contract || contract.isDeleted) {
        res.status(404).json(errorResponse('Contract not found', []));
        return;
      }

      res.status(200).json(successResponse('Contract retrieved successfully', contract));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve contract';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * List contracts with pagination and filters
   * GET /api/v1/contracts
   */
  async listContracts(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const vendorId = req.query.vendorId as string;
      const status = req.query.status as string;
      const contractType = req.query.contractType as string;

      const result = await ContractService.listContracts(page, limit, {
        vendorId,
        status,
        contractType,
      });

      res.status(200).json(successResponse('Contracts retrieved successfully', result));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve contracts';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get expiring contracts
   * GET /api/v1/contracts/expiring
   */
  async getExpiringContracts(req: Request, res: Response): Promise<void> {
    try {
      const daysThreshold = req.query.days ? parseInt(req.query.days as string) : 30;

      const contracts = await ContractService.getExpiringContracts(daysThreshold);

      res.status(200).json(successResponse('Expiring contracts retrieved successfully', contracts));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve expiring contracts';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Update contract
   * PATCH /api/v1/contracts/:id
   */
  async updateContract(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const updates = req.body;

      // Get current contract for audit
      const currentContract = await ContractService.getContractById(id);
      if (!currentContract || currentContract.isDeleted) {
        res.status(404).json(errorResponse('Contract not found', []));
        return;
      }

      const updatedContract = await ContractService.updateContract(id, {
        contractType: updates.contractType,
        status: updates.status,
        vendorId: updates.vendorId,
        assetIds: updates.assetIds,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        endDate: updates.endDate ? new Date(updates.endDate) : undefined,
        renewalDate: updates.renewalDate ? new Date(updates.renewalDate) : undefined,
        amount: updates.amount,
        currency: updates.currency,
        description: updates.description,
        terms: updates.terms,
        renewalReminder: updates.renewalReminder,
        isAutoRenewal: updates.isAutoRenewal,
      });

      if (!updatedContract) {
        res.status(404).json(errorResponse('Contract not found', []));
        return;
      }

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        oldValue: currentContract,
        newValue: updatedContract,
      });

      res.status(200).json(successResponse('Contract updated successfully', updatedContract));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to update contract';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Delete contract (soft delete)
   * DELETE /api/v1/contracts/:id
   */
  async deleteContract(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      // Get current contract for audit
      const currentContract = await ContractService.getContractById(id);
      if (!currentContract || currentContract.isDeleted) {
        res.status(404).json(errorResponse('Contract not found', []));
        return;
      }

      const deletedContract = await ContractService.deleteContract(id);

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        oldValue: currentContract,
      });

      res.status(200).json(successResponse('Contract deleted successfully', deletedContract));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to delete contract';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get contracts by vendor
   * GET /api/v1/contracts/vendor/:vendorId
   */
  async getContractsByVendor(req: Request, res: Response): Promise<void> {
    try {
      const { vendorId } = req.params as { vendorId: string };

      const contracts = await ContractService.getContractsByVendor(vendorId);

      res.status(200).json(successResponse('Vendor contracts retrieved successfully', contracts));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve vendor contracts';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get contracts for an asset
   * GET /api/v1/contracts/asset/:assetId
   */
  async getContractsByAsset(req: Request, res: Response): Promise<void> {
    try {
      const { assetId } = req.params as { assetId: string };

      const contracts = await ContractService.getContractsByAsset(assetId);

      res.status(200).json(successResponse('Asset contracts retrieved successfully', contracts));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve asset contracts';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get contract summary statistics
   * GET /api/v1/contracts/summary
   */
  async getContractSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await ContractService.getContractSummary();

      res.status(200).json(successResponse('Contract summary retrieved successfully', summary));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve contract summary';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },
};
