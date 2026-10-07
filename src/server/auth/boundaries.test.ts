import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clerkAppearance } from '@/components/admin/clerk-appearance';
import { getDictionary } from '@/i18n/get-dictionary';

/**
 * Structural guarantees of the auth design, checked over the source tree so
 * that later phases can't quietly break them.
 */

const SRC = fileURLToPath(new URL('../..', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? [path, ...walk(path)] : [path];
  });
}

const all = walk(SRC).map((path) => ({ path, rel: relative(SRC, path).split(sep).join('/') }));
const sources = all
  .filter((f) => /\.(ts|tsx)$/.test(f.rel) && !/\.test\.ts$/.test(f.rel) && !f.rel.startsWith('test/'))
  .map((f) => ({ ...f, code: readFileSync(f.path, 'utf8') }));
const isClient = (code: string) => /^\s*['"]use client['"]/.test(code);

describe('no public registration', () => {
  it('has no sign-up route anywhere', () => {
    const signUp = all.filter((f) => f.rel.startsWith('app/') && /sign-?up|register/i.test(f.rel));
    expect(signUp.map((f) => f.rel)).toEqual([]);
  });

  it("hides Clerk's sign-up prompt in the sign-in component", () => {
    const footerAction = clerkAppearance.signIn?.elements as Record<string, unknown> | undefined;
    expect(footerAction?.footerAction).toContain('hidden');
  });
});

describe('secrets stay on the server', () => {
  const client = sources.filter((f) => isClient(f.code));

  it('client modules never import server config or the auth layer', () => {
    const offenders = client.filter((f) =>
      /from ['"](@\/config\/env|@\/server\/|@clerk\/nextjs\/server|server-only)/.test(f.code),
    );
    expect(offenders.map((f) => f.rel)).toEqual([]);
  });

  it('client modules never mention server-only variables', () => {
    const offenders = client.filter((f) => /CLERK_SECRET_KEY|ADMIN_CLERK_USER_ID|DATABASE_URL/.test(f.code));
    expect(offenders.map((f) => f.rel)).toEqual([]);
  });

  it('the auth layer is server-only', () => {
    for (const rel of ['server/auth/admin.ts', 'server/auth/route.ts', 'config/env.ts']) {
      expect(sources.find((f) => f.rel === rel)?.code).toMatch(/^import 'server-only';/);
    }
  });
});

describe('the public site is not auth-aware', () => {
  it('public routes, chrome, and features never touch Clerk or the auth layer', () => {
    const publicCode = sources.filter(
      (f) =>
        (f.rel.startsWith('app/[locale]/') || f.rel.startsWith('components/layout/') || f.rel.startsWith('features/')) &&
        !f.rel.startsWith('features/admin/'),
    );
    const offenders = publicCode.filter((f) => /from ['"](@clerk\/|@\/server\/auth)/.test(f.code));
    expect(offenders.map((f) => f.rel)).toEqual([]);
  });
});

describe('every admin resource authorizes itself', () => {
  it('each console page calls the guard (not just the layout)', () => {
    const pages = sources.filter((f) => /^app\/admin\/\(console\)\/.*page\.tsx$/.test(f.rel));
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) expect(page.code, page.rel).toMatch(/requireAdmin\(|getAdminProfile\(/);
  });

  it('each admin Route Handler is wrapped in adminRoute', () => {
    const routes = sources.filter((f) => /^app\/api\/admin\/.*route\.ts$/.test(f.rel));
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(route.code, route.rel).toMatch(/adminRoute\(/);
  });

  it('each admin Server Action module calls requireAdmin', () => {
    const actions = sources.filter(
      (f) =>
        /['"]use server['"]/.test(f.code) && (f.rel.startsWith('app/admin/') || /(^|\/)mutations\.ts$/.test(f.rel)),
    );
    for (const action of actions) expect(action.code, action.rel).toMatch(/requireAdmin\(/);
  });
});

describe('public footer entry point', () => {
  it('labels the link "Admin" in both languages and points it at /admin', () => {
    expect(getDictionary('en').footer.admin).toBe('Admin');
    expect(getDictionary('es').footer.admin).toBe('Admin');
    const footer = sources.find((f) => f.rel === 'components/layout/Footer.tsx')!.code;
    expect(footer).toMatch(/<a href=\{ADMIN_PATH\} rel="nofollow"/);
  });
});
