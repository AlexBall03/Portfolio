import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { authStatus } from '@/config/env';
import { isAdminUserId } from './policy';

/**
 * Admin authorization: the single source of truth.
 *
 * Clerk answers "who is this?"; this module answers "may they administer
 * alexball.dev?". Every protected layout, Server Action, and Route Handler
 * calls `requireAdmin()` itself, because the proxy check alone is not a
 * security boundary (Server Action IDs, for one, can be POSTed to any path).
 */

export interface AdminIdentity {
  /** Clerk user ID; what future `createdBy` / `updatedBy` columns record. */
  userId: string;
}

export type Authorization =
  | { status: 'unconfigured' }
  | { status: 'signed-out' }
  | { status: 'forbidden'; userId: string }
  | { status: 'admin'; admin: AdminIdentity };

/**
 * Resolved once per request (React `cache`), then shared by every caller.
 * Always at request time: `connection()` keeps an authorization decision out
 * of any prerender, even when no session is read (e.g. auth unconfigured).
 */
export const getAuthorization = cache(async (): Promise<Authorization> => {
  await connection();
  const config = authStatus();
  if (!config.configured) return { status: 'unconfigured' };

  const { userId } = await auth();
  if (!userId) return { status: 'signed-out' };
  if (!isAdminUserId(userId, config.env.adminUserId)) return { status: 'forbidden', userId };
  return { status: 'admin', admin: { userId } };
});

/**
 * The guard. Returns the admin identity or ends the request as a 404, so a
 * private resource looks exactly like one that doesn't exist.
 *
 *   export async function updateProject(input: unknown) {
 *     'use server';
 *     const admin = await requireAdmin();
 *     ...
 *   }
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const authorization = await getAuthorization();
  if (authorization.status !== 'admin') notFound();
  return authorization.admin;
}

export async function isAdmin(): Promise<boolean> {
  return (await getAuthorization()).status === 'admin';
}

export interface AdminProfile extends AdminIdentity {
  name: string;
  email: string | null;
  imageUrl: string | null;
}

/** Display details for the console. Never used to decide access. */
export const getAdminProfile = cache(async (): Promise<AdminProfile> => {
  const { userId } = await requireAdmin();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const name = user?.fullName || user?.username || email || 'Administrator';
  return { userId, name, email, imageUrl: user?.hasImage ? user.imageUrl : null };
});
