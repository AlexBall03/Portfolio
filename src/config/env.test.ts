import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_ID, clearAuthEnv, fakeKey, stubAuthEnv } from '@/test/auth';
import { authEnv, authStatus, ConfigError } from './env';

afterEach(() => vi.unstubAllEnvs());

describe('authEnv', () => {
  it('reads the admin ID and the Clerk instance type', () => {
    stubAuthEnv();
    expect(authEnv()).toEqual({ adminUserId: ADMIN_ID, publishableKey: fakeKey('pk'), instance: 'development' });
    stubAuthEnv({ pk: fakeKey('pk', 'live'), sk: fakeKey('sk', 'live') });
    expect(authEnv().instance).toBe('production');
  });

  it('returns the publishable key trimmed, as Clerk needs it', () => {
    stubAuthEnv({ pk: ` ${fakeKey('pk')}\n` });
    expect(authEnv().publishableKey).toBe(fakeKey('pk'));
  });

  it('names every missing variable', () => {
    clearAuthEnv();
    expect(() => authEnv()).toThrow(ConfigError);
    expect(() => authEnv()).toThrow(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ADMIN_CLERK_USER_ID/);
  });

  it('rejects malformed values', () => {
    stubAuthEnv({ admin: 'alex@example.com' });
    expect(() => authEnv()).toThrow(/ADMIN_CLERK_USER_ID/);
    stubAuthEnv({ sk: fakeKey('pk') });
    expect(() => authEnv()).toThrow(/CLERK_SECRET_KEY/);
  });

  it('rejects keys from different Clerk instances (development vs production)', () => {
    stubAuthEnv({ pk: fakeKey('pk', 'test'), sk: fakeKey('sk', 'live') });
    expect(() => authEnv()).toThrow(/instance differs/);
  });

  it('never echoes values in its error', () => {
    const secret = fakeKey('sk', 'live');
    stubAuthEnv({ sk: secret });
    const status = authStatus();
    expect(status.configured).toBe(false);
    expect(JSON.stringify(status)).not.toContain(secret);
  });
});
