import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseTargetError, loadLocalEnv, resolveAdminTarget } from './env';

const POOLED = 'postgresql://owner:s3cret@ep-quiet-sun-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
const DIRECT = 'postgresql://owner:s3cret@ep-quiet-sun-123456.us-east-2.aws.neon.tech/neondb?sslmode=require';
const OTHER_DIRECT = 'postgresql://owner:s3cret@ep-loud-moon-654321.us-east-2.aws.neon.tech/neondb?sslmode=require';

describe('resolveAdminTarget', () => {
  it('uses the direct URL and labels the target without credentials', () => {
    const target = resolveAdminTarget({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT });
    expect(target).toEqual({
      kind: 'postgres',
      url: DIRECT,
      label: 'ep-quiet-sun-123456.us-east-2.aws.neon.tech/neondb',
    });
  });

  it('refuses two URLs that point at different databases', () => {
    const resolve = () => resolveAdminTarget({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: OTHER_DIRECT });
    expect(resolve).toThrow(DatabaseTargetError);
    expect(resolve).toThrow(/different\s+databases/);
  });

  it('refuses a pooled connection for admin work', () => {
    expect(() => resolveAdminTarget({ DATABASE_URL: POOLED })).toThrow(/DATABASE_URL_UNPOOLED/);
    expect(() => resolveAdminTarget({ DATABASE_URL_UNPOOLED: POOLED })).toThrow(/must be the direct one/);
  });

  it('falls back to DATABASE_URL only when it is a direct connection', () => {
    expect(resolveAdminTarget({ DATABASE_URL: DIRECT, DATABASE_URL_UNPOOLED: '' })).toMatchObject({ url: DIRECT });
  });

  it('fails when nothing is configured', () => {
    expect(() => resolveAdminTarget({})).toThrow(/not set/);
  });

  it('recognises the local pglite database and rejects an ambiguous mix', () => {
    expect(resolveAdminTarget({ DATABASE_URL: 'pglite:memory://' })).toEqual({ kind: 'local', url: 'pglite:memory://' });
    expect(() => resolveAdminTarget({ DATABASE_URL: 'pglite:.pglite', DATABASE_URL_UNPOOLED: DIRECT })).toThrow(
      /unambiguous/,
    );
  });

  it('never puts credentials in an error message', () => {
    const cases = [
      { DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: OTHER_DIRECT },
      { DATABASE_URL: POOLED },
      { DATABASE_URL_UNPOOLED: 'owner:s3cret@not a url' },
    ];
    for (const env of cases) {
      try {
        resolveAdminTarget(env);
        expect.unreachable();
      } catch (err) {
        expect((err as Error).message).not.toMatch(/s3cret|owner/);
      }
    }
  });
});

describe('loadLocalEnv', () => {
  const dir = mkdtempSync(join(tmpdir(), 'env-'));
  const file = join(dir, '.env.local');
  writeFileSync(file, 'ADMIN_ENV_TEST_FROM_FILE=file\nADMIN_ENV_TEST_PRESET=file\n');

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.ADMIN_ENV_TEST_FROM_FILE;
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('loads the file locally without overriding variables that are already set', () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('CI', '');
    vi.stubEnv('ADMIN_ENV_TEST_PRESET', 'shell');
    loadLocalEnv(file);
    expect(process.env.ADMIN_ENV_TEST_FROM_FILE).toBe('file');
    expect(process.env.ADMIN_ENV_TEST_PRESET).toBe('shell');
  });

  it.each(['VERCEL', 'CI'])('ignores the file entirely when %s is set', (flag) => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('CI', '');
    vi.stubEnv(flag, '1');
    loadLocalEnv(file);
    expect(process.env.ADMIN_ENV_TEST_FROM_FILE).toBeUndefined();
  });
});
