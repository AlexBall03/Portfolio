import { existsSync } from 'node:fs';

/**
 * Environment resolution for database tooling (`db:*` scripts, drizzle-kit).
 * The app itself reads `DATABASE_URL` through `config/env.ts`.
 *
 * Precedence, highest first:
 *   1. Variables already in the process environment (Vercel, CI, your shell).
 *   2. `.env.local`, and only outside Vercel/CI.
 * A deployment therefore only ever sees the database Vercel selected for it.
 */

type Env = Record<string, string | undefined>;

export class DatabaseTargetError extends Error {
  override name = 'DatabaseTargetError';
}

/** True on Vercel builds/functions and in CI, where only the provided environment counts. */
export function isDeployment(env: Env = process.env): boolean {
  return Boolean(env.VERCEL || env.CI);
}

/** Loads `.env.local` for local tooling. Never overrides variables that are already set. */
export function loadLocalEnv(file = '.env.local'): void {
  if (isDeployment()) return;
  if (existsSync(file)) process.loadEnvFile(file);
}

export type AdminTarget =
  /** In-process PGlite: migrated and bootstrapped on connect by `db/local.ts`. */
  | { kind: 'local'; url: string }
  /** A Postgres server reached over a direct (unpooled) connection. */
  | { kind: 'postgres'; url: string; label: string };

interface ParsedUrl {
  /** `host/database` with Neon's `-pooler` suffix removed: equal for both URLs of one database. */
  identity: string;
  pooled: boolean;
}

function parse(name: string, value: string): ParsedUrl {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // The value is deliberately not echoed: it usually contains a password.
    throw new DatabaseTargetError(`${name} is not a valid connection URL.`);
  }
  const [endpoint = '', ...rest] = url.hostname.split('.');
  const pooled = endpoint.endsWith('-pooler');
  const host = [pooled ? endpoint.slice(0, -'-pooler'.length) : endpoint, ...rest].join('.');
  return { identity: `${host}/${url.pathname.replace(/^\//, '')}`, pooled };
}

/**
 * Chooses the connection for schema and bootstrap work.
 *
 * Prefers `DATABASE_URL_UNPOOLED` (direct) and falls back to `DATABASE_URL`
 * only when that is itself a direct connection. It refuses to guess: if the two
 * variables name different databases (for example one from the shell and one
 * from `.env.local`), it throws instead of picking one.
 */
export function resolveAdminTarget(env: Env = process.env): AdminTarget {
  const appUrl = env.DATABASE_URL?.trim() || undefined;
  const directUrl = env.DATABASE_URL_UNPOOLED?.trim() || undefined;

  if (!appUrl && !directUrl) {
    throw new DatabaseTargetError(
      'DATABASE_URL_UNPOOLED / DATABASE_URL are not set. On Vercel the Neon integration provides them; ' +
        'locally, add them to .env.local.',
    );
  }

  if (appUrl?.startsWith('pglite:')) {
    if (directUrl) {
      throw new DatabaseTargetError(
        'DATABASE_URL is a local pglite: database but DATABASE_URL_UNPOOLED is also set. ' +
          'Unset one of them so the target is unambiguous.',
      );
    }
    return { kind: 'local', url: appUrl };
  }

  const app = appUrl ? parse('DATABASE_URL', appUrl) : undefined;
  const direct = directUrl ? parse('DATABASE_URL_UNPOOLED', directUrl) : undefined;

  if (app && direct && app.identity !== direct.identity) {
    throw new DatabaseTargetError(
      `DATABASE_URL (${app.identity}) and DATABASE_URL_UNPOOLED (${direct.identity}) point at different ` +
        'databases. Refusing to choose between them.',
    );
  }
  if (direct?.pooled) {
    throw new DatabaseTargetError('DATABASE_URL_UNPOOLED is a pooled (-pooler) connection; it must be the direct one.');
  }
  if (direct && directUrl) return { kind: 'postgres', url: directUrl, label: direct.identity };

  if (app?.pooled) {
    throw new DatabaseTargetError(
      'Only a pooled DATABASE_URL is available. Migrations need the direct connection: set DATABASE_URL_UNPOOLED.',
    );
  }
  // Only reachable when `app` is defined (a direct URL in DATABASE_URL, e.g. plain Postgres).
  return { kind: 'postgres', url: appUrl!, label: app!.identity };
}
