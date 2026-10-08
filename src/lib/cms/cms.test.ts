import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { profileTranslationInput, roleTranslationInput } from '@/features/profile/schema';
import { localized } from '@/lib/validation';
import {
  blankLocales,
  errorsByLocale,
  isBlankTranslation,
  localeStatuses,
  translationCoverage,
  translationStatus,
  worstStatus,
} from './locale';
import { clearErrorsAt, deepEqual, getIn, setIn } from './values';

vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }));
const { fieldErrorsFrom, runMutation } = await import('./mutation');
const { reconcileList, syncTranslations } = await import('./write');

afterEach(() => vi.restoreAllMocks());

describe('translations: absent or complete, never copied', () => {
  const schema = localized(roleTranslationInput);

  it('treats a fully blank non-default locale as missing (English fallback)', () => {
    const parsed = schema.parse({ en: { label: 'Engineer' }, es: { label: '  ' } });
    expect(parsed).toEqual({ en: { label: 'Engineer' } });
    expect('es' in parsed && parsed.es !== undefined).toBe(false);
  });

  it('validates a partly filled translation in full', () => {
    const profile = localized(profileTranslationInput);
    const en = {
      title: 'T',
      statement: 'S',
      availabilityText: 'A',
      locationLabel: 'L',
      about: ['P'],
      heroFocus: 'F',
      heroStackLine: 'H',
      heroChips: [],
    };
    const result = profile.safeParse({ en, es: { ...en, title: 'Título', statement: '', about: [''] } });
    expect(result.success).toBe(false);
    const errors = fieldErrorsFrom(result.error!);
    expect(errors['es.statement']).toBe('Required');
    expect(errors['es.about.0']).toBe('Required');
    expect(errors['es.title']).toBeUndefined();
  });

  it('always requires the default locale', () => {
    const result = schema.safeParse({ en: { label: '' }, es: { label: 'Ingeniero' } });
    expect(fieldErrorsFrom(result.error!)).toEqual({ 'en.label': 'Required' });
  });

  it('classifies translation status by the save schema', () => {
    expect(isBlankTranslation({ a: '', b: [' '], c: { d: null } })).toBe(true);
    expect(isBlankTranslation({ a: '', flag: false })).toBe(false);
    expect(translationStatus(roleTranslationInput, { label: '' })).toBe('missing');
    expect(translationStatus(roleTranslationInput, undefined)).toBe('missing');
    expect(translationStatus(roleTranslationInput, { label: 'x'.repeat(81) })).toBe('partial');
    expect(translationStatus(roleTranslationInput, { label: 'Ingeniero' })).toBe('complete');
  });

  it('summarizes lists for tabs and the dashboard', () => {
    const items = [
      { en: { label: 'A' }, es: { label: 'A' } },
      { en: { label: 'B' }, es: { label: '' } },
    ];
    expect(localeStatuses(roleTranslationInput, items)).toEqual({ en: 'complete', es: 'missing' });
    expect(localeStatuses(roleTranslationInput, [])).toEqual({ en: 'complete', es: 'complete' });
    expect(worstStatus(['complete', 'missing', 'partial'])).toBe('partial');
    expect(translationCoverage(roleTranslationInput, items, 'es')).toEqual({ complete: 1, partial: 0, missing: 1 });
    expect(blankLocales(() => ({ label: '' }))).toEqual({ en: { label: '' }, es: { label: '' } });
  });

  it('counts server errors per locale tab', () => {
    expect(
      errorsByLocale({
        fullName: 'Required',
        'translations.es.title': 'Required',
        'items.2.translations.es.label': 'Required',
        'items.0.translations.en.label': 'Required',
      }),
    ).toEqual({ en: 1, es: 2 });
  });
});

describe('form values', () => {
  it('compares structurally for dirty tracking', () => {
    expect(deepEqual({ a: [1, { b: 'x' }] }, { a: [1, { b: 'x' }] })).toBe(true);
    expect(deepEqual({ a: [1] }, { a: [1, 2] })).toBe(false);
    expect(deepEqual({ a: undefined }, {})).toBe(false);
    expect(deepEqual([], {})).toBe(false);
  });

  it('reads and immutably writes by path', () => {
    const value = { items: [{ translations: { es: { label: '' } } }], other: { x: 1 } };
    const next = setIn(value, ['items', 0, 'translations', 'es', 'label'], 'Hola');
    expect(getIn(next, ['items', 0, 'translations', 'es', 'label'])).toBe('Hola');
    expect(getIn(value, ['items', 0, 'translations', 'es', 'label'])).toBe('');
    expect(next.other).toBe(value.other);
    expect(Array.isArray(next.items)).toBe(true);
  });

  it('clears errors at and below a path only', () => {
    const errors = { 'about.0': 'Required', about: 'Add one', aboutX: 'keep', title: 'keep' };
    expect(clearErrorsAt(errors, ['about'])).toEqual({ aboutX: 'keep', title: 'keep' });
  });
});

describe('runMutation', () => {
  const schema = z.object({ name: z.string().min(1, 'Required') });

  it('validates before writing and reports errors by path', async () => {
    const write = vi.fn();
    const result = await runMutation(schema, { name: '' }, write);
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: 'Required' } });
    expect(write).not.toHaveBeenCalled();
  });

  it('returns what the write returned', async () => {
    const result = await runMutation(schema, { name: 'x', extra: 1 }, async (data) => ({ saved: data }));
    expect(result).toMatchObject({ ok: true, data: { saved: { name: 'x' } } });
    expect(result.ok && typeof result.savedAt).toBe('string');
  });

  it('logs unexpected failures and reports them generically', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await runMutation(schema, { name: 'x' }, async () => {
      throw new Error('connection reset: secret details');
    });
    expect(result).toEqual({ ok: false, fieldErrors: {}, formError: expect.not.stringContaining('secret') });
    expect(log).toHaveBeenCalledOnce();
  });
});

describe('repository write conventions', () => {
  it('upserts present locales and deletes absent ones', async () => {
    const calls: string[] = [];
    await syncTranslations(
      { en: { label: 'A' } },
      { upsert: async (l) => calls.push(`upsert ${l}`), remove: async (l) => calls.push(`remove ${l}`) },
    );
    expect(calls).toEqual(['upsert en', 'remove es']);
  });

  it('reconciles an ordered list: update known, insert new or unknown, delete the rest', async () => {
    const calls: string[] = [];
    let next = 0;
    const saved = await reconcileList(['a', 'b', 'c'], [{ id: 'c' }, {}, { id: 'forged' }, { id: 'a' }, { id: 'a' }], {
      update: async (id, _item, order) => calls.push(`update ${id}@${order}`),
      insert: async (_item, order) => {
        calls.push(`insert @${order}`);
        return `new${next++}`;
      },
      remove: async (ids) => calls.push(`remove ${ids.join(',')}`),
    });
    expect(saved).toEqual(['c', 'new0', 'new1', 'a', 'new2']);
    expect(calls).toEqual(['update c@0', 'insert @1', 'insert @2', 'update a@3', 'insert @4', 'remove b']);
  });
});
