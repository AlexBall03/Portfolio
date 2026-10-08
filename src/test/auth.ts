import { vi } from 'vitest';

/**
 * Fake Clerk configuration for tests. Keys are assembled at runtime so no
 * key-shaped literal exists in the repository for secret scanners to flag.
 */
export const fakeKey = (kind: 'pk' | 'sk', instance: 'test' | 'live' = 'test') =>
  [kind, instance, btoa('not-a-real-key.example$').replace(/=+$/, '')].join('_');

export const ADMIN_ID = 'user_admin000000000000000000';
export const OTHER_ID = 'user_someone0000000000000000';

export function stubAuthEnv(overrides: Partial<Record<'pk' | 'sk' | 'admin', string>> = {}) {
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', overrides.pk ?? fakeKey('pk'));
  vi.stubEnv('CLERK_SECRET_KEY', overrides.sk ?? fakeKey('sk'));
  vi.stubEnv('ADMIN_CLERK_USER_ID', overrides.admin ?? ADMIN_ID);
}

export function clearAuthEnv() {
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', '');
  vi.stubEnv('CLERK_SECRET_KEY', '');
  vi.stubEnv('ADMIN_CLERK_USER_ID', '');
}
