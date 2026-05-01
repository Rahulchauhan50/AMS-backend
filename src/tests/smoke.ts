import assert from 'node:assert/strict';
import { AuthService } from '../modules/auth/auth.service';
import { SecurityService } from '../common/security/security.service';

async function run() {
  const checks: Array<{ name: string; fn: () => void | Promise<void> }> = [
    {
      name: 'password strength rejects weak passwords',
      fn: () => {
        const result = SecurityService.validatePasswordStrength('weak');
        assert.equal(result.valid, false);
        assert.ok(result.errors.length > 0);
      },
    },
    {
      name: 'sanitizeInput strips script tags',
      fn: () => {
        const sanitized = SecurityService.sanitizeInput('<script>alert(1)</script>Hello');
        assert.equal(sanitized, 'Hello');
      },
    },
    {
      name: 'file validation rejects double extensions',
      fn: () => {
        const result = SecurityService.validateFileUpload('report.pdf.exe', 1024, ['pdf', 'docx'], 2048);
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(error => error.includes('Double extensions')));
      },
    },
    {
      name: 'password hash comparison works',
      fn: async () => {
        const password = 'Str0ng!Password123';
        const hash = await AuthService.hashPassword(password);
        const matches = await AuthService.comparePassword(password, hash);
        assert.equal(matches, true);
      },
    },
    {
      name: 'access token round-trips through verification',
      fn: () => {
        const token = AuthService.generateAccessToken({ _id: '507f1f77bcf86cd799439011', roles: ['Admin'] } as any);
        const decoded = AuthService.verifyAccessToken(token) as any;
        assert.equal(decoded.id, '507f1f77bcf86cd799439011');
        assert.deepEqual(decoded.roles, ['Admin']);
      },
    },
  ];

  let failures = 0;

  for (const check of checks) {
    try {
      await check.fn();
      console.log(`PASS ${check.name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${check.name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`All ${checks.length} smoke checks passed.`);
}

run().catch(error => {
  console.error('Smoke test runner failed.');
  console.error(error);
  process.exit(1);
});
