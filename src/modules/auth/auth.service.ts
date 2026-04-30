import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../users/user.model';
import { env } from '../../config/env';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(user: IUser): string {
    return jwt.sign(
      { id: user._id, roles: user.roles },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
  }

  static generateRefreshToken(user: IUser): string {
    return jwt.sign(
      { id: user._id },
      env.REFRESH_TOKEN_SECRET,
      { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any }
    );
  }

  static verifyAccessToken(token: string): any {
    return jwt.verify(token, env.JWT_SECRET);
  }

  static verifyRefreshToken(token: string): any {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
  }
}
