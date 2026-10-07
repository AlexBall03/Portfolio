import { defineConfig } from 'drizzle-kit';

// Migrations run over a direct (unpooled) connection; the app itself uses the
// pooled URL through the Neon HTTP driver. Neon's Vercel integration provides both.
process.loadEnvFile?.('.env.local');

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: 'postgresql',
  casing: 'snake_case',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: { url: url ?? '' },
  strict: true,
  verbose: true,
});
