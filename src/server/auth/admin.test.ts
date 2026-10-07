import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_ID, clearAuthEnv, OTHER_ID, stubAuthEnv } from '@/test/auth';

// Clerk resolves the session; the tests decide what it says.
const session = vi.hoisted(() => ({ userId: null as string | null, calls: 0 }));
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => {
    session.calls++;
    return { userId: session.userId };
  },
  currentUser: async () => ({
    fullName: 'Alex Ball',
    username: null,
    primaryEmailAddress: { emailAddress: 'admin@example.com' },
    hasImage: false,
    imageUrl: '',
  }),
}));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
}));

const { getAdminProfile, getAuthorization, isAdmin, requireAdmin } = await import('./admin');

/** What a Phase 4 Server Action looks like: authorize first, then mutate. */
const mutations: string[] = [];
async function renameProject(name: string) {
  const admin = await requireAdmin();
  mutations.push(`${name} by ${admin.userId}`);
  return { ok: true as const };
}

beforeEach(() => {
  stubAuthEnv();
  session.userId = null;
  session.calls = 0;
  mutations.length = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe('getAuthorization', () => {
  it('classifies every session state', async () => {
    expect(await getAuthorization()).toEqual({ status: 'signed-out' });
    session.userId = OTHER_ID;
    expect(await getAuthorization()).toEqual({ status: 'forbidden', userId: OTHER_ID });
    session.userId = ADMIN_ID;
    expect(await getAuthorization()).toEqual({ status: 'admin', admin: { userId: ADMIN_ID } });
  });

  it('is unconfigured (and never asks Clerk) without the auth env', async () => {
    clearAuthEnv();
    session.userId = ADMIN_ID;
    expect(await getAuthorization()).toEqual({ status: 'unconfigured' });
    expect(session.calls).toBe(0);
  });
});

describe('requireAdmin', () => {
  it('returns the admin identity for the configured admin', async () => {
    session.userId = ADMIN_ID;
    await expect(requireAdmin()).resolves.toEqual({ userId: ADMIN_ID });
    await expect(isAdmin()).resolves.toBe(true);
  });

  // Clerk reports an invalid or expired session as no user, same as signed out.
  it.each([
    ['signed out / expired session', null],
    ['a different signed-in user', OTHER_ID],
  ])('ends the request as a 404 for %s', async (_case, userId) => {
    session.userId = userId;
    await expect(requireAdmin()).rejects.toThrow('404');
    await expect(isAdmin()).resolves.toBe(false);
  });

  it('rejects even the admin ID when configuration is missing or invalid', async () => {
    session.userId = ADMIN_ID;
    clearAuthEnv();
    await expect(requireAdmin()).rejects.toThrow('404');
    stubAuthEnv({ admin: 'not-a-clerk-id' });
    await expect(requireAdmin()).rejects.toThrow('404');
  });
});

describe('a protected server operation', () => {
  it('runs for the admin and records who did it', async () => {
    session.userId = ADMIN_ID;
    await expect(renameProject('Weather')).resolves.toEqual({ ok: true });
    expect(mutations).toEqual([`Weather by ${ADMIN_ID}`]);
  });

  it('is rejected before any work for anyone else', async () => {
    for (const userId of [null, OTHER_ID]) {
      session.userId = userId;
      await expect(renameProject('Weather')).rejects.toThrow('404');
    }
    expect(mutations).toEqual([]);
  });
});

describe('getAdminProfile', () => {
  it('describes the admin', async () => {
    session.userId = ADMIN_ID;
    await expect(getAdminProfile()).resolves.toEqual({
      userId: ADMIN_ID,
      name: 'Alex Ball',
      email: 'admin@example.com',
      imageUrl: null,
    });
  });

  it('is itself guarded', async () => {
    session.userId = OTHER_ID;
    await expect(getAdminProfile()).rejects.toThrow('404');
  });
});
