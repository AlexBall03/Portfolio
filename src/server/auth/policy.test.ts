import { describe, expect, it } from 'vitest';
import { ADMIN_ID, OTHER_ID } from '@/test/auth';
import { isAdminUserId } from './policy';

describe('isAdminUserId', () => {
  it('accepts only the exact configured Clerk user ID', () => {
    expect(isAdminUserId(ADMIN_ID, ADMIN_ID)).toBe(true);
    expect(isAdminUserId(OTHER_ID, ADMIN_ID)).toBe(false);
  });

  it('rejects lookalikes: case, whitespace, prefixes', () => {
    expect(isAdminUserId(ADMIN_ID.toUpperCase(), ADMIN_ID)).toBe(false);
    expect(isAdminUserId(` ${ADMIN_ID}`, ADMIN_ID)).toBe(false);
    expect(isAdminUserId(ADMIN_ID.slice(0, -1), ADMIN_ID)).toBe(false);
  });

  it('fails closed when either side is missing', () => {
    expect(isAdminUserId(null, ADMIN_ID)).toBe(false);
    expect(isAdminUserId(undefined, ADMIN_ID)).toBe(false);
    expect(isAdminUserId('', ADMIN_ID)).toBe(false);
    expect(isAdminUserId(ADMIN_ID, null)).toBe(false);
    expect(isAdminUserId(ADMIN_ID, '')).toBe(false);
    expect(isAdminUserId('', '')).toBe(false);
  });
});
