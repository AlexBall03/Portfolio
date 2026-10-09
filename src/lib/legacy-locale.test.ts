import { describe, expect, it } from 'vitest';
import { legacyLocaleRedirect } from './legacy-locale';

describe('legacyLocaleRedirect', () => {
  it('sends retired Spanish URLs to the English page', () => {
    expect(legacyLocaleRedirect('/es')).toBe('/');
    expect(legacyLocaleRedirect('/es/')).toBe('/');
    expect(legacyLocaleRedirect('/es/projects')).toBe('/projects');
    expect(legacyLocaleRedirect('/es/projects/example-project')).toBe('/projects/example-project');
  });

  it('keeps the old /en prefix pointing at the unprefixed URL', () => {
    expect(legacyLocaleRedirect('/en')).toBe('/');
    expect(legacyLocaleRedirect('/en/about')).toBe('/about');
  });

  it('only ever returns a path on this site', () => {
    expect(legacyLocaleRedirect('/es//evil.com')).toBe('/evil.com');
    expect(legacyLocaleRedirect('/es///evil.com/x')).toBe('/evil.com/x');
  });

  it('leaves every other path alone', () => {
    expect(legacyLocaleRedirect('/')).toBeNull();
    expect(legacyLocaleRedirect('/about')).toBeNull();
    expect(legacyLocaleRedirect('/espresso')).toBeNull();
    expect(legacyLocaleRedirect('/projects/es')).toBeNull();
    expect(legacyLocaleRedirect('/english')).toBeNull();
  });
});
