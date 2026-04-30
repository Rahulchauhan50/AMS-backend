import { Request, Response, NextFunction } from 'express';
import { errorResponse, successResponse } from '../../common/response/response.formatter';
import { AssetCategoryService } from './asset-category.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

const validationError = (field: string, message: string) => [{ field, message }];

const isCustomFieldType = (value: unknown): value is 'text' | 'number' | 'date' | 'select' | 'boolean' => {
  return value === 'text' || value === 'number' || value === 'date' || value === 'select' || value === 'boolean';
};

const validateCustomFields = (customFields: unknown) => {
  if (!Array.isArray(customFields)) {
    return 'Custom fields must be an array';
  }

  for (const field of customFields) {
    if (!field || typeof field !== 'object') {
      return 'Each custom field must be an object';
    }

    const candidate = field as Record<string, unknown>;
    if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
      return 'Custom field name is required';
    }

    if (typeof candidate.label !== 'string' || !candidate.label.trim()) {
      return 'Custom field label is required';
    }

    if (!isCustomFieldType(candidate.type)) {
      return 'Custom field type must be text, number, date, select, or boolean';
    }

    if (candidate.options !== undefined && !Array.isArray(candidate.options)) {
      return 'Custom field options must be an array';
    }
  }

  return null;
};

const buildDuplicateError = (duplicate: { name?: string; code?: string; prefix?: string }) => {
  const errors = [];

  if (duplicate.name) {
    errors.push({ field: 'name', message: 'Category name already exists' });
  }

  if (duplicate.code) {
    errors.push({ field: 'code', message: 'Category code already exists' });
  }

  if (duplicate.prefix) {
    errors.push({ field: 'prefix', message: 'Category prefix already exists' });
  }

  return errors;
};

export class AssetCategoryController {
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, code, prefix, description, customFields } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Category name is required')));
      }

      if (!code || typeof code !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('code', 'Category code is required')));
      }

      if (!prefix || typeof prefix !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('prefix', 'Category prefix is required')));
      }

      const customFieldValidationError = validateCustomFields(customFields);
      if (customFieldValidationError) {
        return res.status(400).json(errorResponse('Validation failed', validationError('customFields', customFieldValidationError)));
      }

      const duplicate = await AssetCategoryService.findDuplicate({ name, code, prefix });
      if (duplicate) {
        return res.status(409).json(errorResponse('Validation failed', buildDuplicateError({ name, code, prefix })));
      }

      const category = await AssetCategoryService.createCategory({
        name,
        code,
        prefix,
        description,
        customFields,
      });

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: null,
        newValue: category,
      });

      return res.status(201).json(successResponse('Asset category created successfully', category));
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json(errorResponse('Validation failed', [
          { field: 'name', message: 'Category name, code, or prefix already exists' },
        ]));
      }

      next(error);
    }
  }

  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await AssetCategoryService.listCategories();
      return res.status(200).json(successResponse('Asset categories retrieved successfully', categories, { total: categories.length }));
    } catch (error) {
      next(error);
    }
  }

  static async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await AssetCategoryService.getCategoryById(req.params.id as string);
      if (!category) {
        return res.status(404).json(errorResponse('Asset category not found'));
      }

      return res.status(200).json(successResponse('Asset category retrieved successfully', category));
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, code, prefix, description, customFields } = req.body;

      if (name !== undefined && typeof name !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('name', 'Category name must be a string')));
      }

      if (code !== undefined && typeof code !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('code', 'Category code must be a string')));
      }

      if (prefix !== undefined && typeof prefix !== 'string') {
        return res.status(400).json(errorResponse('Validation failed', validationError('prefix', 'Category prefix must be a string')));
      }

      if (customFields !== undefined) {
        const customFieldValidationError = validateCustomFields(customFields);
        if (customFieldValidationError) {
          return res.status(400).json(errorResponse('Validation failed', validationError('customFields', customFieldValidationError)));
        }
      }

      const oldCategory = await AssetCategoryService.getCategoryById(req.params.id as string);
      if (!oldCategory) {
        return res.status(404).json(errorResponse('Asset category not found'));
      }

      const duplicate = await AssetCategoryService.findDuplicate({ name, code, prefix }, req.params.id as string);
      if (duplicate) {
        return res.status(409).json(errorResponse('Validation failed', buildDuplicateError({ name: duplicate.name, code: duplicate.code, prefix: duplicate.prefix })));
      }

      const category = await AssetCategoryService.updateCategory(req.params.id as string, {
        name,
        code,
        prefix,
        description,
        customFields,
      });

      if (!category) {
        return res.status(404).json(errorResponse('Asset category not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldCategory,
        newValue: category,
      });

      return res.status(200).json(successResponse('Asset category updated successfully', category));
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json(errorResponse('Validation failed', [
          { field: 'name', message: 'Category name, code, or prefix already exists' },
        ]));
      }

      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const oldCategory = await AssetCategoryService.getCategoryById(req.params.id as string);
      if (!oldCategory) {
        return res.status(404).json(errorResponse('Asset category not found'));
      }

      const category = await AssetCategoryService.deleteCategory(req.params.id as string);
      if (!category) {
        return res.status(404).json(errorResponse('Asset category not found'));
      }

      await AuditLogService.record(res.locals.auditContext, {
        oldValue: oldCategory,
        newValue: { isDeleted: true },
      });

      return res.status(200).json(successResponse('Asset category deleted successfully', category));
    } catch (error) {
      next(error);
    }
  }
}