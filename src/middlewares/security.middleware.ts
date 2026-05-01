import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../common/security/security.service';

/**
 * Request sanitization middleware
 * Sanitizes input data to prevent injection attacks
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query as any) as any;
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj: any): any {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = SecurityService.sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? SecurityService.sanitizeInput(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Security headers middleware
 * Adds security-related HTTP headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy (basic)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );

  // Disable caching for sensitive responses
  if (req.path.includes('/auth') || req.path.includes('/settings')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Rate limiting for login attempts
 * Tracks failed attempts and temporarily locks out accounts
 */
export const loginRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return next();
  }

  try {
    const { User } = await import('../modules/users/user.model');

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });

    if (!user) {
      return next();
    }

    // Check if account is locked out
    if (user.isLockedOut && user.lockedOutUntil) {
      if (new Date() < user.lockedOutUntil) {
        const remainingMinutes = Math.ceil(
          (user.lockedOutUntil.getTime() - new Date().getTime()) / 60000
        );
        return res.status(429).json({
          success: false,
          message: `Account is locked due to too many failed login attempts. Try again in ${remainingMinutes} minutes.`,
          errors: ['Account temporarily locked'],
        });
      } else {
        // Unlock the account if lockout period has expired
        await User.findByIdAndUpdate(user._id, {
          isLockedOut: false,
          failedLoginAttempts: 0,
          lockedOutUntil: null,
        });
      }
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    console.error('Login rate limiter error:', error);
    next();
  }
};

/**
 * General rate limiting middleware
 * Implement using express-rate-limit if needed
 */
export const generalRateLimiter = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(clientIp);

    if (!record || now > record.resetTime) {
      requestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        errors: ['Rate limit exceeded'],
      });
    }

    next();
  };
};

/**
 * Trusted proxy middleware
 * Ensures X-Forwarded-For header is trusted only from known proxies
 */
export const trustedProxyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // List of trusted proxy IPs (in production, configure based on your infrastructure)
  const trustedProxies = ['127.0.0.1', 'localhost', '::1'];

  if (req.get('X-Forwarded-For')) {
    const forwardedFor = req.get('X-Forwarded-For');
    const clientIp = forwardedFor?.split(',')[0].trim();

    if (!trustedProxies.includes(req.ip || '')) {
      // Untrusted proxy - don't trust X-Forwarded-For
      // Cast to any to avoid assigning to readonly property on Express's Request
      (req as any).ip = req.socket.remoteAddress || 'unknown';
    }
  }

  next();
};
