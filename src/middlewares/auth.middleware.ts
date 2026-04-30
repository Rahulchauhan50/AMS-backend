import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { User } from '../modules/users/user.model';
import { errorResponse } from '../common/response/response.formatter';
import { Role } from '../modules/access-control/role.model';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json(errorResponse('Not authorized, no token provided'));
    }

    const decoded = AuthService.verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user || user.isDeleted || user.status !== 'active') {
      return res.status(401).json(errorResponse('Not authorized, user not found or inactive'));
    }

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json(errorResponse('Not authorized, token invalid or expired'));
  }
};

export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = (req as any).user;

      if (!currentUser) {
        return res.status(401).json(errorResponse('Not authorized, no user context found'));
      }

      if (currentUser.roles?.includes('Super Admin')) {
        return next();
      }

      const activeRoles = await Role.find({
        name: { $in: currentUser.roles || [] },
        isDeleted: false,
      }).select('permissions');

      const grantedPermissions = new Set<string>();

      for (const role of activeRoles) {
        for (const permission of role.permissions) {
          grantedPermissions.add(permission);
        }
      }

      const hasAllPermissions = requiredPermissions.every((permission) => grantedPermissions.has(permission));

      if (!hasAllPermissions) {
        return res.status(403).json(errorResponse('Forbidden, insufficient permissions'));
      }

      return next();
    } catch (error) {
      return res.status(403).json(errorResponse('Forbidden, insufficient permissions'));
    }
  };
};
