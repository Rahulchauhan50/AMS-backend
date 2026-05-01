export class SecurityService {
  /**
   * Validate password strength
   * Requirements: At least 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
   */
  static validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*...)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password contains common patterns (sequential numbers, repeated chars)
   */
  static hasCommonPatterns(password: string): boolean {
    // Check for common sequences (123, abc, etc.)
    if (/(?:0{2,}|1{2,}|2{2,}|3{2,}|4{2,}|5{2,}|6{2,}|7{2,}|8{2,}|9{2,})/.test(password)) {
      return true;
    }

    // Check for sequential numbers
    if (/(?:012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/.test(password)) {
      return true;
    }

    return false;
  }

    /**
   * Check if email is valid format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';

    // Remove script tags and event handlers
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove common SQL injection patterns
    sanitized = sanitized.replace(/('|(\\')|(;)|(--)|(\*)|(\|\||&&)|(xp_|sp_))/gi, '');

    return sanitized.trim();
  }

  /**
   * Check if file upload is valid
   */
  static validateFileUpload(
    filename: string,
    fileSize: number,
    allowedExtensions: string[],
    maxFileSizeKB: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!filename) {
      errors.push('Filename is required');
      return { valid: false, errors };
    }

    // Check file extension
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.map(e => e.toLowerCase()).includes(fileExtension)) {
      errors.push(`File type .${fileExtension} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    // Check file size
    const fileSizeKB = fileSize / 1024;
    if (fileSizeKB > maxFileSizeKB) {
      errors.push(`File size ${fileSizeKB.toFixed(2)}KB exceeds maximum allowed size of ${maxFileSizeKB}KB`);
    }

    // Check for double extensions (security risk)
    if (filename.split('.').length > 2) {
      const fullExt = filename.split('.').slice(-2).join('.');
      errors.push(`Double extensions like .${fullExt} are not allowed for security reasons`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Check if password is at risk (has been compromised)
   * In production, integrate with external service like Have I Been Pwned API
   */
  static async isPasswordCompromised(password: string): Promise<boolean> {
    // This is a placeholder. In production, check against:
    // - Have I Been Pwned API
    // - Common password lists
    // - Organization blacklist

    const commonPasswords = [
      'password',
      'password123',
      'admin',
      'admin123',
      'letmein',
      'welcome',
      'monkey',
      'dragon',
      'master',
      'sunshine',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }
}
