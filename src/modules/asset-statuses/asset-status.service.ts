import { AssetStatus } from './asset-status.model';

type AssetStatusInput = {
  name: string;
  code: string;
  description?: string;
  allowedTransitions?: string[];
  isDefault?: boolean;
};

type AssetStatusUpdateInput = Partial<Omit<AssetStatusInput, 'code'>>;

const normalizeText = (value: string) => value.trim();
const normalizeCode = (value: string) => value.trim().toUpperCase();
const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((value) => normalizeCode(value)).filter(Boolean)));

export class AssetStatusService {
  static async listStatuses() {
    return AssetStatus.find({ isDeleted: false }).sort({ name: 1 });
  }

  static async getStatusById(statusId: string) {
    return AssetStatus.findOne({ _id: statusId, isDeleted: false });
  }

  static async findDuplicate(input: { name?: string; code?: string }, ignoreId?: string) {
    const query: Record<string, unknown> = { isDeleted: false };
    const orConditions: Array<Record<string, unknown>> = [];

    if (typeof input.name === 'string') {
      orConditions.push({ name: normalizeText(input.name) });
    }

    if (typeof input.code === 'string') {
      orConditions.push({ code: normalizeCode(input.code) });
    }

    if (ignoreId) {
      query._id = { $ne: ignoreId };
    }

    if (orConditions.length === 0) {
      return null;
    }

    return AssetStatus.findOne({ ...query, $or: orConditions });
  }

  static async validateTransitions(transitions: string[], currentCode?: string) {
    const normalizedTransitions = uniqueStrings(transitions);

    if (currentCode) {
      const selfTransition = normalizedTransitions.includes(normalizeCode(currentCode));
      if (selfTransition) {
        const error = new Error('Status cannot transition to itself');
        (error as any).statusCode = 400;
        (error as any).errors = [{ field: 'allowedTransitions', message: 'A status cannot include itself as an allowed transition' }];
        throw error;
      }
    }

    const knownStatuses = await AssetStatus.find({ code: { $in: normalizedTransitions }, isDeleted: false }).select('code');
    const knownCodes = knownStatuses.map((status) => status.code);
    const missingCodes = normalizedTransitions.filter((code) => !knownCodes.includes(code));

    if (missingCodes.length > 0) {
      const error = new Error('Some allowed transitions do not exist');
      (error as any).statusCode = 400;
      (error as any).errors = missingCodes.map((code) => ({
        field: 'allowedTransitions',
        message: `Transition not found: ${code}`,
      }));
      throw error;
    }

    return normalizedTransitions;
  }

  static async createStatus(input: AssetStatusInput) {
    const allowedTransitions = input.allowedTransitions ? await this.validateTransitions(input.allowedTransitions, input.code) : [];

    const status = await AssetStatus.create({
      name: normalizeText(input.name),
      code: normalizeCode(input.code),
      description: input.description?.trim() || '',
      allowedTransitions,
      isDefault: input.isDefault || false,
    });

    if (status.isDefault) {
      await AssetStatus.updateMany({ _id: { $ne: status._id }, isDeleted: false }, { $set: { isDefault: false } });
    }

    return status;
  }

  static async updateStatus(statusId: string, input: AssetStatusUpdateInput) {
    const status = await AssetStatus.findOne({ _id: statusId, isDeleted: false });
    if (!status) {
      return null;
    }

    if (typeof input.name === 'string') {
      status.name = normalizeText(input.name);
    }

    if (typeof input.description === 'string') {
      status.description = input.description.trim();
    }

    if (typeof input.isDefault === 'boolean') {
      status.isDefault = input.isDefault;
    }

    if (Array.isArray(input.allowedTransitions)) {
      status.allowedTransitions = await this.validateTransitions(input.allowedTransitions, status.code);
    }

    await status.save();

    if (status.isDefault) {
      await AssetStatus.updateMany({ _id: { $ne: status._id }, isDeleted: false }, { $set: { isDefault: false } });
    }

    return status;
  }

  static async deleteStatus(statusId: string) {
    const status = await AssetStatus.findOne({ _id: statusId, isDeleted: false });
    if (!status) {
      return null;
    }

    status.isDeleted = true;
    await status.save();

    return status;
  }

  static async getTransitionMap() {
    const statuses = await AssetStatus.find({ isDeleted: false }).sort({ name: 1 });
    return statuses.map((status) => ({
      id: status._id,
      name: status.name,
      code: status.code,
      allowedTransitions: status.allowedTransitions,
      isDefault: status.isDefault,
    }));
  }
}