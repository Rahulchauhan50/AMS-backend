import { Request, Response, NextFunction } from 'express';
import { User } from '../users/user.model';
import { AuthService } from './auth.service';
import { SecurityService } from '../../common/security/security.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';

export class AuthController {
  static async registerSuperAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;

      // Check if any user exists
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        return res.status(403).json(errorResponse('Super Admin already registered'));
      }

      // Validate password strength and check for compromised/common passwords
      const pwdCheck = SecurityService.validatePasswordStrength(password);
      if (!pwdCheck.valid) {
        return res.status(400).json(errorResponse('Weak password', pwdCheck.errors));
      }

      if (await SecurityService.isPasswordCompromised(password)) {
        return res.status(400).json(errorResponse('Password is too common or has been compromised', ['compromised_password']));
      }

      const passwordHash = await AuthService.hashPassword(password);
      const user = await User.create({
        name,
        email,
        passwordHash,
        roles: ['Super Admin'],
      });

      res.status(201).json(successResponse('Super Admin registered successfully', user));
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });

      // Generic invalid response
      const invalidResponse = () => res.status(401).json(errorResponse('Invalid email or password'));

      if (!user) {
        return invalidResponse();
      }

      // Check account status
      if (user.status !== 'active') {
        return res.status(403).json(errorResponse('Account is inactive'));
      }

      // Check lockout
      const now = new Date();
      if (user.isLockedOut && user.lockedOutUntil && now < user.lockedOutUntil) {
        const remainingMinutes = Math.ceil((user.lockedOutUntil.getTime() - now.getTime()) / 60000);
        return res.status(429).json(errorResponse(`Account locked. Try again in ${remainingMinutes} minutes`));
      }

      const passwordMatches = await AuthService.comparePassword(password, user.passwordHash);
      if (!passwordMatches) {
        // Increment failed attempts
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const LOCKOUT_THRESHOLD = 5;
        const LOCKOUT_MINUTES = 15;

        const update: any = { failedLoginAttempts: attempts };

        if (attempts >= LOCKOUT_THRESHOLD) {
          update.isLockedOut = true;
          update.lockedOutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        }

        await User.findByIdAndUpdate(user._id, update);

        if (attempts >= LOCKOUT_THRESHOLD) {
          return res.status(429).json(errorResponse('Account locked due to too many failed login attempts'));
        }

        return invalidResponse();
      }

      // Successful login - reset counters
      if (user.failedLoginAttempts || user.isLockedOut) {
        await User.findByIdAndUpdate(user._id, {
          failedLoginAttempts: 0,
          isLockedOut: false,
          lockedOutUntil: null,
        });
      }

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json(successResponse('Login successful', { accessToken, user }));
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(401).json(errorResponse('Refresh token missing'));
      }

      const decoded = AuthService.verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.id);
      if (!user || user.isDeleted || user.status !== 'active') {
        return res.status(401).json(errorResponse('Invalid refresh token'));
      }

      // Rotate refresh token: issue a new refresh token and set cookie
      const accessToken = AuthService.generateAccessToken(user);
      const newRefreshToken = AuthService.generateRefreshToken(user);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json(successResponse('Token refreshed', { accessToken }));
    } catch (error) {
      res.status(401).json(errorResponse('Invalid or expired refresh token'));
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('refreshToken');
    res.status(200).json(successResponse('Logout successful'));
  }

  static async getMe(req: Request, res: Response) {
    // req.user is populated by auth middleware
    res.status(200).json(successResponse('User profile retrieved', (req as any).user));
  }
}
