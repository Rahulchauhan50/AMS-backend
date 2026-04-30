import { User, type IUser } from './user.model';
import { AuthService } from '../auth/auth.service';
import { AccessControlService } from '../access-control/access-control.service';

const normalizeText = (value: string) => value.trim();
const normalizeEmail = (value: string) => value.trim().toLowerCase();

const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export class UserService {
  static async listUsers() {
    return User.find({ isDeleted: false }).select('-passwordHash').sort({ createdAt: -1 });
  }

  static async getUserById(userId: string) {
    return User.findOne({ _id: userId, isDeleted: false }).select('-passwordHash');
  }

  static async createUser(input: {
    name: string;
    email: string;
    password: string;
    roles?: string[];
    status?: 'active' | 'inactive';
  }) {
    const roleNames = input.roles ? uniqueStrings(input.roles) : ['IT Supervisor'];

    if (roleNames.length > 0) {
      await AccessControlService.assignRolesToUserRolesOnly(roleNames);
    }

    const passwordHash = await AuthService.hashPassword(input.password);

    const user = await User.create({
      name: normalizeText(input.name),
      email: normalizeEmail(input.email),
      passwordHash,
      roles: roleNames,
      status: input.status || 'active',
    });

    const sanitizedUser = await User.findById(user._id).select('-passwordHash');
    return sanitizedUser;
  }

  static async updateUser(
    userId: string,
    input: { name?: string; email?: string; roles?: string[] }
  ) {
    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      return null;
    }

    if (typeof input.name === 'string') {
      user.name = normalizeText(input.name);
    }

    if (typeof input.email === 'string') {
      user.email = normalizeEmail(input.email);
    }

    if (Array.isArray(input.roles)) {
      const normalizedRoles = uniqueStrings(input.roles);
      if (normalizedRoles.length > 0) {
        await AccessControlService.validateRoleNames(normalizedRoles);
      }
      user.roles = normalizedRoles;
    }

    await user.save();

    return User.findById(user._id).select('-passwordHash');
  }

  static async updateUserStatus(userId: string, status: 'active' | 'inactive') {
    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      return null;
    }

    user.status = status;
    await user.save();

    return User.findById(user._id).select('-passwordHash');
  }

  static async resetPassword(userId: string, password: string) {
    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      return null;
    }

    user.passwordHash = await AuthService.hashPassword(password);
    await user.save();

    return User.findById(user._id).select('-passwordHash');
  }

  static async createManyDefaults() {
    return User.find({ isDeleted: false });
  }
}