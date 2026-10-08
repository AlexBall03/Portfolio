import 'server-only';
import { z } from 'zod';

/**
 * Server environment, validated lazily per concern so that a missing optional
 * integration (e.g. GitHub) degrades that feature instead of crashing the app.
 * Nothing here is ever exposed to the client except Clerk's publishable key,
 * which is public by design. It is validated here so that auth configuration
 * fails as a whole, and read here (at runtime) so that Clerk gets the same
 * value the proxy checked instead of the copy Next inlines at build time.
 */

const nonEmpty = z.string().trim().min(1);

const databaseSchema = z.object({ DATABASE_URL: nonEmpty });
const githubSchema = z.object({ GITHUB_TOKEN: nonEmpty });
/**
 * Vercel Blob (public store, project images). Connecting a store to the Vercel
 * project sets one of these; `@vercel/blob` reads them itself.
 */
const blobSchema = z.union([
  z.object({ BLOB_READ_WRITE_TOKEN: nonEmpty }),
  z.object({ BLOB_STORE_ID: nonEmpty }),
]);
/**
 * Vercel Blob (private store, resume PDFs). A second store, connected with the
 * env prefix `PRIVATE_BLOB` so its credentials never mix with the public
 * store's; passed explicitly by `integrations/blob/private-store.ts`.
 */
const privateBlobSchema = z.union([
  z.object({ PRIVATE_BLOB_READ_WRITE_TOKEN: nonEmpty }).transform((e) => ({ token: e.PRIVATE_BLOB_READ_WRITE_TOKEN })),
  z.object({ PRIVATE_BLOB_STORE_ID: nonEmpty }).transform((e) => ({ storeId: e.PRIVATE_BLOB_STORE_ID })),
]);
const contactSchema = z.object({
  RESEND_API_KEY: nonEmpty,
  CONTACT_TO_EMAIL: z.email().default('contact@alexball.dev'),
  CONTACT_FROM_EMAIL: z.email().default('contact@alexball.dev'),
});

/** Clerk keys carry their instance type: `test` = Development, `live` = Production. */
const clerkKey = (prefix: 'pk' | 'sk') => z.string().trim().regex(new RegExp(`^${prefix}_(test|live)_\\S+$`));
const instanceOf = (key: string) => (key.split('_')[1] === 'live' ? 'production' : 'development');

/**
 * Clerk's own publishable-key rules (`isPublishableKey` in @clerk/shared): three
 * `_` parts, the last base64 for `<frontend-api host>$`. Checked here so that a
 * key Clerk would reject (a stray invisible character, a doubled paste) turns
 * admin off with a named warning instead of a 500 from inside Clerk.
 */
function isClerkPublishableKey(key: string) {
  const [prefix, , encoded, ...rest] = key.split('_');
  if (prefix !== 'pk' || !encoded || rest.length || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
  try {
    const decoded = atob(encoded);
    const host = decoded.slice(0, -1);
    return decoded.endsWith('$') && !host.includes('$') && host.includes('.');
  } catch {
    return false;
  }
}

const authSchema = z
  .object({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkKey('pk').refine(isClerkPublishableKey),
    CLERK_SECRET_KEY: clerkKey('sk'),
    // The one administrator, by Clerk's stable user ID (differs per Clerk instance).
    ADMIN_CLERK_USER_ID: z.string().trim().regex(/^user_[A-Za-z0-9]+$/),
  })
  .refine((env) => instanceOf(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) === instanceOf(env.CLERK_SECRET_KEY), {
    path: ['CLERK_SECRET_KEY (instance differs from the publishable key)'],
  });

export const AUTH_ENV_KEYS = ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'ADMIN_CLERK_USER_ID'] as const;

export class ConfigError extends Error {
  override name = 'ConfigError';
}

function read<T extends z.ZodType>(schema: T, concern: string): z.infer<T> {
  // Empty strings in .env files mean "unset", so defaults apply.
  const source = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''),
  );
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new ConfigError(`Missing or invalid ${concern} environment variable(s): ${keys}`);
  }
  return parsed.data;
}

export const databaseEnv = () => {
  try {
    return read(databaseSchema, 'database');
  } catch (err) {
    throw new ConfigError(
      `${(err as Error).message}. Add your Neon connection string to .env.local, ` +
        'or use DATABASE_URL=pglite:.pglite for a local database with no setup.',
    );
  }
};
export const githubEnv = () => read(githubSchema, 'GitHub');
export const contactEnv = () => read(contactSchema, 'contact');
export const blobEnv = () => read(blobSchema, 'Vercel Blob');
export const privateBlobEnv = (): { token: string } | { storeId: string } => read(privateBlobSchema, 'private Vercel Blob');

export interface AuthEnv {
  adminUserId: string;
  /** Pass explicitly to Clerk: its own `process.env` read is frozen at build time. */
  publishableKey: string;
  /** Which Clerk instance the keys belong to. */
  instance: 'development' | 'production';
}

/**
 * Clerk + admin configuration. Throws a ConfigError naming the bad keys (never
 * their values). There is deliberately no fallback: without all three, nobody
 * is an admin, in every environment.
 */
export function authEnv(): AuthEnv {
  const env = read(authSchema, 'admin authentication');
  return {
    adminUserId: env.ADMIN_CLERK_USER_ID,
    publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    instance: instanceOf(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  };
}

export type AuthStatus = { configured: true; env: AuthEnv } | { configured: false; error: string };

/** Non-throwing variant for code that must branch on configuration (proxy, admin layout). */
export function authStatus(): AuthStatus {
  try {
    return { configured: true, env: authEnv() };
  } catch (err) {
    if (err instanceof ConfigError) return { configured: false, error: err.message };
    throw err;
  }
}
