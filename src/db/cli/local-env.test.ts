import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { loadLocalEnv } from './local-env';

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
