import { AssetCategory, type IAssetCategory } from './asset-category.model';

type CustomFieldInput = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required?: boolean;
  options?: string[];
};

type AssetCategoryInput = {
  name: string;
  code: string;
  prefix: string;
  description?: string;
  customFields?: CustomFieldInput[];
};

type AssetCategoryUpdateInput = Partial<AssetCategoryInput>;

const normalizeText = (value: string) => value.trim();
const normalizeCode = (value: string) => value.trim().toUpperCase();
const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const normalizeCustomFields = (customFields: CustomFieldInput[] = []) =>
  customFields.map((field) => ({
    name: normalizeText(field.name),
    label: normalizeText(field.label),
    type: field.type,
    required: field.required || false,
    options: uniqueStrings(field.options || []),
  }));

export class AssetCategoryService {
  static async listCategories() {
    return AssetCategory.find({ isDeleted: false }).sort({ name: 1 });
  }

  static async getCategoryById(categoryId: string) {
    return AssetCategory.findOne({ _id: categoryId, isDeleted: false });
  }

  static async createCategory(input: AssetCategoryInput) {
    const category = await AssetCategory.create({
      name: normalizeText(input.name),
      code: normalizeCode(input.code),
      prefix: normalizeCode(input.prefix),
      description: input.description?.trim() || '',
      customFields: normalizeCustomFields(input.customFields || []),
    });

    return category;
  }

  static async updateCategory(categoryId: string, input: AssetCategoryUpdateInput) {
    const category = await AssetCategory.findOne({ _id: categoryId, isDeleted: false });
    if (!category) {
      return null;
    }

    if (typeof input.name === 'string') {
      category.name = normalizeText(input.name);
    }

    if (typeof input.code === 'string') {
      category.code = normalizeCode(input.code);
    }

    if (typeof input.prefix === 'string') {
      category.prefix = normalizeCode(input.prefix);
    }

    if (typeof input.description === 'string') {
      category.description = input.description.trim();
    }

    if (Array.isArray(input.customFields)) {
      category.customFields = normalizeCustomFields(input.customFields);
    }

    await category.save();
    return category;
  }

  static async deleteCategory(categoryId: string) {
    const category = await AssetCategory.findOne({ _id: categoryId, isDeleted: false });
    if (!category) {
      return null;
    }

    category.isDeleted = true;
    await category.save();
    return category;
  }

  static async findDuplicate(input: { name?: string; code?: string; prefix?: string }, ignoreId?: string) {
    const query: Record<string, unknown> = { isDeleted: false };
    const orConditions: Array<Record<string, unknown>> = [];

    if (typeof input.name === 'string') {
      orConditions.push({ name: normalizeText(input.name) });
    }

    if (typeof input.code === 'string') {
      orConditions.push({ code: normalizeCode(input.code) });
    }

    if (typeof input.prefix === 'string') {
      orConditions.push({ prefix: normalizeCode(input.prefix) });
    }

    if (ignoreId) {
      query._id = { $ne: ignoreId };
    }

    if (orConditions.length === 0) {
      return null;
    }

    return AssetCategory.findOne({ ...query, $or: orConditions });
  }
}