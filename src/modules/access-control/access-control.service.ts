import { User, type IUser } from '../users/user.model';
import { Permission } from './permission.model';
import { Role } from './role.model';
import type { IRole } from './role.model';

type RoleOperationResult = {
  item: IRole | null;
  missing: string[];
};

type UserOperationResult = {
  item: IUser | null;
  missing: string[];
};

type OperationResult<T> = {
  item: T | null;
  missing: string[];
};

const normalizeCode = (value: string) => value.trim().toLowerCase();
const normalizeText = (value: string) => value.trim();

const uniqueStrings = (values: string[]) => Array.from(new Set(values));

const toStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const cleaned = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return uniqueStrings(cleaned);
};

export class AccessControlService {
  static normalizePermissionCodes(values: string[]): string[] {
    return uniqueStrings(values.map(normalizeCode));
  }

  static normalizeRoleNames(values: string[]): string[] {
    return uniqueStrings(values.map(normalizeText));
  }

  static async createPermission(input: { code: string; name: string; description?: string }) {
    const permission = await Permission.create({
      code: normalizeCode(input.code),
      name: normalizeText(input.name),
      description: input.description?.trim() || '',
    });

    return permission;
  }

  static async listPermissions() {
    return Permission.find({ isDeleted: false }).sort({ code: 1 });
  }

  static async createRole(input: { name: string; description?: string; permissions?: string[] }) {
    const permissionCodes = input.permissions ? this.normalizePermissionCodes(input.permissions) : [];

    if (permissionCodes.length > 0) {
      await this.ensurePermissionsExist(permissionCodes);
    }

    const role = await Role.create({
      name: normalizeText(input.name),
      description: input.description?.trim() || '',
      permissions: permissionCodes,
    });

    return role;
  }

  static async listRoles() {
    return Role.find({ isDeleted: false }).sort({ name: 1 });
  }

  static async getRoleById(roleId: string) {
    return Role.findOne({ _id: roleId, isDeleted: false });
  }

  static async updateRole(
    roleId: string,
    input: { name?: string; description?: string }
  ) {
    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return null;
    }

    const previousName = role.name;

    if (typeof input.name === 'string') {
      role.name = normalizeText(input.name);
    }

    if (typeof input.description === 'string') {
      role.description = input.description.trim();
    }

    await role.save();

    if (input.name && input.name.trim() !== previousName) {
      await User.updateMany(
        { roles: previousName, isDeleted: false },
        { $set: { 'roles.$[role]': role.name } },
        { arrayFilters: [{ role: previousName }] }
      );
    }

    return role;
  }

  static async deleteRole(roleId: string) {
    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return null;
    }

    role.isDeleted = true;
    await role.save();

    await User.updateMany(
      { roles: role.name, isDeleted: false },
      { $pull: { roles: role.name } }
    );

    return role;
  }

  static async setRolePermissions(roleId: string, permissions: unknown): Promise<RoleOperationResult> {
    const permissionCodes = toStringArray(permissions);
    if (!permissionCodes) {
      return { item: null, missing: ['permissions'] };
    }

    await this.ensurePermissionsExist(permissionCodes);

    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return { item: null, missing: [] };
    }

    role.permissions = permissionCodes;
    await role.save();

    return { item: role, missing: [] };
  }

  static async assignRolesToUser(userId: string, roles: unknown): Promise<UserOperationResult> {
    const roleNames = toStringArray(roles);
    if (!roleNames) {
      return { item: null, missing: ['roles'] };
    }

    const activeRoles = await Role.find({ name: { $in: roleNames }, isDeleted: false }).select('name');
    const foundRoleNames = activeRoles.map((role) => role.name);
    const missingRoles = roleNames.filter((roleName) => !foundRoleNames.includes(roleName));

    if (missingRoles.length > 0) {
      return { item: null, missing: missingRoles };
    }

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      return { item: null, missing: [] };
    }

    user.roles = uniqueStrings(roleNames);
    await user.save();

    return { item: user, missing: [] };
  }

  static async validateRoleNames(roleNames: string[]) {
    const normalizedRoleNames = this.normalizeRoleNames(roleNames);
    const activeRoles = await Role.find({ name: { $in: normalizedRoleNames }, isDeleted: false }).select('name');

    const foundRoleNames = activeRoles.map((role) => role.name);
    const missingRoles = normalizedRoleNames.filter((roleName) => !foundRoleNames.includes(roleName));

    if (missingRoles.length > 0) {
      const error = new Error('Some roles do not exist');
      (error as any).statusCode = 400;
      (error as any).errors = missingRoles.map((roleName) => ({
        field: 'roles',
        message: `Role not found: ${roleName}`,
      }));
      throw error;
    }
  }

  static async assignRolesToUserRolesOnly(roleNames: string[]) {
    await this.validateRoleNames(roleNames);
    return this.normalizeRoleNames(roleNames);
  }

  static async getPermissionsForRoles(roleNames: string[]) {
    const activeRoles = await Role.find({ name: { $in: roleNames }, isDeleted: false }).select('permissions');
    const permissionCodes = new Set<string>();

    for (const role of activeRoles) {
      for (const permissionCode of role.permissions) {
        permissionCodes.add(permissionCode);
      }
    }

    return Array.from(permissionCodes);
  }

  static async ensurePermissionsExist(permissionCodes: string[]) {
    const activePermissions = await Permission.find({
      code: { $in: permissionCodes },
      isDeleted: false,
    }).select('code');

    const foundCodes = activePermissions.map((permission) => permission.code);
    const missingCodes = permissionCodes.filter((permissionCode) => !foundCodes.includes(permissionCode));

    if (missingCodes.length > 0) {
      const error = new Error('Some permissions do not exist');
      (error as any).statusCode = 400;
      (error as any).errors = missingCodes.map((code) => ({
        field: 'permissions',
        message: `Permission not found: ${code}`,
      }));
      throw error;
    }
  }
}