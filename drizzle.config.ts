import { defineConfig } from 'drizzle-kit';
import { resolveAdminTarget } from './src/db/admin/env';
import { loadLocalEnv } from './src/db/cli/local-env';

// drizzle-kit is used for `db:generate` (offline) and `db:studio`. Migrations
// are applied by `db:prepare` / `db:migrate`, which share this env resolution:
// .env.local is read only outside Vercel/CI, and the direct (unpooled) URL is used.
loadLocalEnv();

function studioUrl(): string {
  try {
    const target = resolveAdminTarget();
    return target.kind === 'postgres' ? target.url : '';
  } catch {
    // `db:generate` needs no database; `db:studio` reports the missing URL itself.
    return '';
  }
}

export default defineConfig({
  dialect: 'postgresql',
  casing: 'snake_case',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: { url: studioUrl() },
  strict: true,
  verbose: true,
});
