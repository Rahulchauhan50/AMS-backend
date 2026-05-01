import { Request, Response } from 'express';
import { CompliancePolicyService, ComplianceCheckService } from './compliance.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';
import { AuditLogService } from '../audit-logs/audit-log.service';

export const ComplianceController = {
  /**
   * Create a new compliance policy
   * POST /api/v1/compliance/policies
   */
  async createPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, severity, categoryIds, checks, enabled } = req.body;

      // Validation
      if (!name || !severity || !checks || !Array.isArray(checks) || checks.length === 0) {
        res.status(400).json(
          errorResponse('Missing required fields', [
            'name, severity, and checks array are required',
          ])
        );
        return;
      }

      const policy = await CompliancePolicyService.createPolicy({
        name,
        description,
        severity,
        categoryIds,
        checks,
        enabled,
      });

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: policy,
      });

      res.status(201).json(successResponse('Compliance policy created successfully', policy));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to create compliance policy';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get policy by ID
   * GET /api/v1/compliance/policies/:id
   */
  async getPolicyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      const policy = await CompliancePolicyService.getPolicyById(id);

      if (!policy || policy.isDeleted) {
        res.status(404).json(errorResponse('Compliance policy not found', []));
        return;
      }

      res.status(200).json(successResponse('Compliance policy retrieved successfully', policy));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve compliance policy';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * List compliance policies with pagination
   * GET /api/v1/compliance/policies
   */
  async listPolicies(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await CompliancePolicyService.listPolicies(page, limit);

      res.status(200).json(successResponse('Compliance policies retrieved successfully', result));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve compliance policies';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Update compliance policy
   * PATCH /api/v1/compliance/policies/:id
   */
  async updatePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const updates = req.body;

      // Get current policy for audit
      const currentPolicy = await CompliancePolicyService.getPolicyById(id);
      if (!currentPolicy || currentPolicy.isDeleted) {
        res.status(404).json(errorResponse('Compliance policy not found', []));
        return;
      }

      const updatedPolicy = await CompliancePolicyService.updatePolicy(id, {
        name: updates.name,
        description: updates.description,
        severity: updates.severity,
        categoryIds: updates.categoryIds,
        checks: updates.checks,
        enabled: updates.enabled,
      });

      if (!updatedPolicy) {
        res.status(404).json(errorResponse('Compliance policy not found', []));
        return;
      }

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        oldValue: currentPolicy,
        newValue: updatedPolicy,
      });

      res.status(200).json(successResponse('Compliance policy updated successfully', updatedPolicy));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to update compliance policy';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Delete compliance policy (soft delete)
   * DELETE /api/v1/compliance/policies/:id
   */
  async deletePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      // Get current policy for audit
      const currentPolicy = await CompliancePolicyService.getPolicyById(id);
      if (!currentPolicy || currentPolicy.isDeleted) {
        res.status(404).json(errorResponse('Compliance policy not found', []));
        return;
      }

      const deletedPolicy = await CompliancePolicyService.deletePolicy(id);

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        oldValue: currentPolicy,
      });

      res.status(200).json(successResponse('Compliance policy deleted successfully', deletedPolicy));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to delete compliance policy';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Run compliance checks for a specific policy
   * POST /api/v1/compliance/run-checks
   */
  async runChecks(req: Request, res: Response): Promise<void> {
    try {
      const { policyId } = req.body;

      if (!policyId) {
        res.status(400).json(
          errorResponse('Missing required fields', ['policyId is required'])
        );
        return;
      }

      const results = await ComplianceCheckService.runPolicyChecks(policyId);

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: {
          action: 'run_checks',
          policyId,
          resultsCount: results.length,
        },
      });

      res.status(200).json(
        successResponse(
          'Compliance checks executed successfully',
          {
            policyId,
            resultsCount: results.length,
            results,
          }
        )
      );
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to run compliance checks';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Run all enabled compliance policies
   * POST /api/v1/compliance/run-all
   */
  async runAllChecks(req: Request, res: Response): Promise<void> {
    try {
      const results = await ComplianceCheckService.runAllPolicies();

      // Audit log
      await AuditLogService.record(res.locals.auditContext, {
        newValue: {
          action: 'run_all_checks',
          resultsCount: results.length,
        },
      });

      res.status(200).json(
        successResponse(
          'All compliance checks executed successfully',
          {
            resultsCount: results.length,
            results,
          }
        )
      );
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to run compliance checks';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get compliance results for a policy
   * GET /api/v1/compliance/results
   */
  async getResults(req: Request, res: Response): Promise<void> {
    try {
      const policyId = req.query.policyId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      let result;
      if (policyId) {
        result = await ComplianceCheckService.getResultsByPolicy(policyId, page, limit);
      } else {
        result = await ComplianceCheckService.getNonCompliantResults(page, limit);
      }

      res.status(200).json(successResponse('Compliance results retrieved successfully', result));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve compliance results';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get compliance result by ID
   * GET /api/v1/compliance/results/:id
   */
  async getResultById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      const result = await ComplianceCheckService.getResultsByPolicy(id, 1, 1);

      if (!result.results.length) {
        res.status(404).json(errorResponse('Compliance result not found', []));
        return;
      }

      res.status(200).json(successResponse('Compliance result retrieved successfully', result.results[0]));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve compliance result';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Get compliance summary
   * GET /api/v1/compliance/summary
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await ComplianceCheckService.getComplianceSummary();

      res.status(200).json(successResponse('Compliance summary retrieved successfully', summary));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to retrieve compliance summary';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },
};
