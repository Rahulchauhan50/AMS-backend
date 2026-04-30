import { Request, Response, NextFunction } from 'express';
import { User } from '../users/user.model';
import { AuthService } from './auth.service';
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

      const user = await User.findOne({ email, isDeleted: false });
      if (!user || !(await AuthService.comparePassword(password, user.passwordHash))) {
        return res.status(401).json(errorResponse('Invalid email or password'));
      }

      if (user.status !== 'active') {
        return res.status(403).json(errorResponse('Account is inactive'));
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

      const accessToken = AuthService.generateAccessToken(user);
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
