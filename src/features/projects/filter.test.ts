import { describe, expect, it } from 'vitest';
import {
  filterProjects,
  filtersToQuery,
  hasFilters,
  NO_FILTERS,
  normalizeText,
  parseFilters,
  type FilterableProject,
} from './filter';
import { technologyUsage } from './technologies';

const p = (id: string, techSlugs: string[], text: string, isLive = false, featured = false): FilterableProject => ({
  id,
  featured,
  isLive,
  techSlugs,
  text: normalizeText(text),
});

const list = [
  p('a', ['react', 'typescript'], 'Weather App TypeScript React forecasts', true, true),
  p('b', ['typescript', 'nodejs'], 'API Gateway Node.js TypeScript'),
  p('c', ['java'], 'Diseño de compiladores Java'),
];

describe('filterProjects', () => {
  it('returns everything, in order, with no filters', () => {
    expect(filterProjects(list, NO_FILTERS).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(hasFilters(NO_FILTERS)).toBe(false);
  });

  it('matches every search word, ignoring case and accents', () => {
    expect(filterProjects(list, { ...NO_FILTERS, query: 'typescript  API' }).map((x) => x.id)).toEqual(['b']);
    expect(filterProjects(list, { ...NO_FILTERS, query: 'DISENO' }).map((x) => x.id)).toEqual(['c']);
  });

  it('requires all selected technologies and honors the live filter', () => {
    expect(filterProjects(list, { ...NO_FILTERS, techs: ['typescript'] }).map((x) => x.id)).toEqual(['a', 'b']);
    expect(filterProjects(list, { ...NO_FILTERS, techs: ['typescript', 'react'] }).map((x) => x.id)).toEqual(['a']);
    expect(filterProjects(list, { ...NO_FILTERS, liveOnly: true }).map((x) => x.id)).toEqual(['a']);
    expect(filterProjects(list, { ...NO_FILTERS, query: 'zzz' })).toEqual([]);
  });
});

describe('URL filters', () => {
  const known = new Set(['react', 'typescript']);

  it('round-trips and drops unknown or duplicate technologies', () => {
    const f = parseFilters(new URLSearchParams('q=app&tech=react,bogus,react&live=1'), known);
    expect(f).toEqual({ query: 'app', techs: ['react'], liveOnly: true });
    expect(filtersToQuery(f)).toBe('?q=app&tech=react&live=1');
    expect(filtersToQuery(NO_FILTERS)).toBe('');
  });
});

describe('technologyUsage', () => {
  it('counts projects per technology, most used first', () => {
    const usage = technologyUsage([
      { technologies: [{ slug: 'ts', name: 'TypeScript' }, { slug: 'react', name: 'React' }] },
      { technologies: [{ slug: 'ts', name: 'TypeScript' }] },
    ]);
    expect(usage).toEqual([
      { slug: 'ts', name: 'TypeScript', count: 2 },
      { slug: 'react', name: 'React', count: 1 },
    ]);
  });
});
