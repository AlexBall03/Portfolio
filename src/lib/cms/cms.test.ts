import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { clearErrorsAt, deepEqual, getIn, setIn } from './values';

vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }));
const { fieldErrorsFrom, runMutation } = await import('./mutation');
const { reconcileList } = await import('./write');

afterEach(() => vi.restoreAllMocks());

describe('form values', () => {
  it('compares structurally for dirty tracking', () => {
    expect(deepEqual({ a: [1, { b: 'x' }] }, { a: [1, { b: 'x' }] })).toBe(true);
    expect(deepEqual({ a: [1] }, { a: [1, 2] })).toBe(false);
    expect(deepEqual({ a: undefined }, {})).toBe(false);
    expect(deepEqual([], {})).toBe(false);
  });

  it('reads and immutably writes by path', () => {
    const value = { items: [{ details: { label: '' } }], other: { x: 1 } };
    const next = setIn(value, ['items', 0, 'details', 'label'], 'Hello');
    expect(getIn(next, ['items', 0, 'details', 'label'])).toBe('Hello');
    expect(getIn(value, ['items', 0, 'details', 'label'])).toBe('');
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

  it('keys nested errors by their dotted path', () => {
    const list = z.object({ items: z.array(z.object({ label: z.string().min(1, 'Required') })) });
    const result = list.safeParse({ items: [{ label: 'a' }, { label: '' }] });
    expect(fieldErrorsFrom(result.error!)).toEqual({ 'items.1.label': 'Required' });
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
