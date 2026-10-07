import { existsSync } from 'node:fs';
import { isDeployment } from '../admin/env';

/**
 * `.env.local` loading for the `db:*` scripts and drizzle-kit, which run outside
 * Next.js. The app never imports this: Next.js loads `.env.local` itself, and
 * filesystem access here would otherwise be traced into the server bundle.
 *
 * Never overrides variables that are already set, and does nothing on Vercel or
 * in CI, so a deployment only ever sees the database Vercel selected for it.
 */
export function loadLocalEnv(file = '.env.local'): void {
  if (isDeployment()) return;
  if (existsSync(file)) process.loadEnvFile(file);
}
