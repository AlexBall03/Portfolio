import { describe, expect, it } from 'vitest';
import { ADMIN_ID, OTHER_ID } from '@/test/auth';
import { adminGate } from './gate';

const gate = (pathname: string, userId: string | null, adminUserId: string | null = ADMIN_ID, search = '') =>
  adminGate({ pathname, search, userId, adminUserId });

describe('adminGate (proxy layer)', () => {
  it('sends signed-out visitors to sign-in, keeping where they were going', () => {
    expect(gate('/admin', null)).toEqual({ action: 'redirect', location: '/admin/sign-in?redirect_url=%2Fadmin' });
    expect(gate('/admin/projects', null, ADMIN_ID, '?tab=2')).toEqual({
      action: 'redirect',
      location: '/admin/sign-in?redirect_url=%2Fadmin%2Fprojects%3Ftab%3D2',
    });
  });

  it('treats an invalid or expired session (no user ID) exactly like signed out', () => {
    expect(gate('/admin/anything', null).action).toBe('redirect');
    expect(gate('/api/admin/session', null).action).toBe('not-found');
  });

  it('answers signed-out admin API requests with a 404, never a redirect', () => {
    expect(gate('/api/admin/session', null)).toEqual({ action: 'not-found' });
    expect(gate('/api/admin', null)).toEqual({ action: 'not-found' });
  });

  it('hides every admin page and API from a signed-in user who is not the admin', () => {
    for (const path of ['/admin', '/admin/projects', '/admin/x/y', '/api/admin/session']) {
      expect(gate(path, OTHER_ID)).toEqual({ action: 'not-found' });
    }
  });

  it('lets the admin through', () => {
    expect(gate('/admin', ADMIN_ID)).toEqual({ action: 'next' });
    expect(gate('/admin/projects/new', ADMIN_ID)).toEqual({ action: 'next' });
    expect(gate('/api/admin/session', ADMIN_ID)).toEqual({ action: 'next' });
  });

  it('keeps the sign-in page reachable for everyone', () => {
    for (const user of [null, OTHER_ID, ADMIN_ID]) {
      expect(gate('/admin/sign-in', user)).toEqual({ action: 'next' });
      expect(gate('/admin/sign-in/factor-one', user)).toEqual({ action: 'next' });
    }
  });

  it('does not confuse lookalike paths with the sign-in page', () => {
    expect(gate('/admin/sign-in-other', null).action).toBe('redirect');
    expect(gate('/admin/sign-up', null).action).toBe('redirect');
  });

  it('without configuration: pages render the notice, APIs do not exist', () => {
    expect(gate('/admin', null, null)).toEqual({ action: 'next' });
    expect(gate('/admin', ADMIN_ID, null)).toEqual({ action: 'next' });
    expect(gate('/api/admin/session', ADMIN_ID, null)).toEqual({ action: 'not-found' });
  });
});
