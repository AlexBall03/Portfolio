import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_ID, clearAuthEnv, OTHER_ID, stubAuthEnv } from '@/test/auth';

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: session.userId }), currentUser: async () => null }));
vi.mock('next/server', () => ({ connection: async () => {} }));

const { GET } = await import('@/app/api/admin/session/route');
const { adminRoute } = await import('./route');

const request = () => new Request('https://alexball.dev/api/admin/session');

beforeEach(() => {
  stubAuthEnv();
  session.userId = null;
});
afterEach(() => vi.unstubAllEnvs());

describe('admin Route Handlers (direct HTTP)', () => {
  it('serve the admin, uncached', async () => {
    session.userId = ADMIN_ID;
    const res = await GET(request(), undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: ADMIN_ID });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('look like a missing route to %s', async (_case, userId) => {
    session.userId = userId;
    const res = await GET(request(), undefined);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });

  it('look missing when auth is not configured', async () => {
    clearAuthEnv();
    session.userId = ADMIN_ID;
    expect((await GET(request(), undefined)).status).toBe(404);
  });

  it('refuse cross-site writes from the admin session (CSRF)', async () => {
    session.userId = ADMIN_ID;
    const handler = vi.fn(() => Response.json({}));
    const post = (headers: Record<string, string>) =>
      adminRoute(handler)(new Request('https://alexball.dev/api/admin/x', { method: 'POST', headers }), {});
    expect((await post({ origin: 'https://evil.example', host: 'alexball.dev' })).status).toBe(404);
    expect((await post({ host: 'alexball.dev' })).status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
    expect((await post({ origin: 'https://alexball.dev', host: 'alexball.dev' })).status).toBe(200);
  });

  it('never run the handler for a non-admin', async () => {
    const handler = vi.fn(() => Response.json({}));
    session.userId = OTHER_ID;
    await adminRoute(handler)(request(), {});
    expect(handler).not.toHaveBeenCalled();
  });
});
