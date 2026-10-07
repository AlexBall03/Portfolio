import { describe, expect, it } from 'vitest';
import { DatabaseTargetError, resolveAdminTarget } from './env';

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
