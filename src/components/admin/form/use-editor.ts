'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { FieldErrors, MutationResult } from '@/lib/cms/result';
import { clearErrorsAt, deepEqual, getIn, type Path, pathKey, setIn } from '@/lib/cms/values';
import { guardHistory } from '@/lib/client/history-guard';

export type EditorStatus =
  | { kind: 'idle' }
  | { kind: 'saved'; at: string }
  | { kind: 'error'; message: string };

export interface Editor<V> {
  values: V;
  /** What the server last stored (e.g. the saved status while edits are pending). */
  baseline: V;
  /** Server-reported errors, keyed by path (`items.2.title`). */
  errors: FieldErrors;
  dirty: boolean;
  pending: boolean;
  status: EditorStatus;
  get: (path: Path) => unknown;
  /** Sets one value and clears that path's error. */
  set: (path: Path, value: unknown) => void;
  /** Structural edits (add / remove / reorder). Clears errors under `scope`, whose indexes are now stale. */
  update: (fn: (values: V) => V, scope?: Path) => void;
  errorFor: (path: Path) => string | undefined;
  /** Props for a text field bound to `path`. */
  text: (path: Path) => { value: string; onChange: (value: string) => void; error: string | undefined };
  /**
   * Saves the current values. `override` is merged in for this save only
   * (Publish = `submit({ status: 'published' })`) and allows saving with no edits.
   */
  submit: (override?: Partial<V>) => void;
  discard: () => void;
  /** Replaces the baseline and values with state the server reports from elsewhere (an upload). */
  reset: (values: V) => void;
}

/**
 * State for one admin form: the values being edited, the last saved baseline
 * (dirty = differs from it), server field errors, and a guarded save.
 *
 * - Duplicate submits are ignored while a save is in flight (a ref, so even
 *   two clicks in one frame can't both send).
 * - On success the baseline becomes what the server stored (new rows get ids).
 * - Leaving with unsaved changes asks first (`useUnsavedChangesGuard`).
 */
export function useEditor<V>(initial: V, save: (values: V) => Promise<MutationResult<V>>): Editor<V> {
  const [baseline, setBaseline] = useState(initial);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<EditorStatus>({ kind: 'idle' });
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

  const dirty = !deepEqual(values, baseline);
  useUnsavedChangesGuard(dirty);

  const set = useCallback((path: Path, value: unknown) => {
    setValues((v) => setIn(v, path, value));
    setErrors((e) => clearErrorsAt(e, path));
    setStatus((s) => (s.kind === 'saved' ? { kind: 'idle' } : s));
  }, []);

  const update = useCallback((fn: (values: V) => V, scope: Path = []) => {
    setValues(fn);
    setErrors((e) => (scope.length ? clearErrorsAt(e, scope) : {}));
    setStatus((s) => (s.kind === 'saved' ? { kind: 'idle' } : s));
  }, []);

  const submit = (override?: Partial<V>) => {
    if (inFlight.current || (!dirty && !override)) return;
    inFlight.current = true;
    const submitted = override ? { ...values, ...override } : values;
    startTransition(async () => {
      try {
        const result = await save(submitted);
        if (result.ok) {
          setBaseline(result.data);
          setValues(result.data);
          setErrors({});
          setStatus({ kind: 'saved', at: result.savedAt });
        } else {
          setErrors(result.fieldErrors);
          setStatus({ kind: 'error', message: result.formError ?? 'Some fields need attention.' });
        }
      } catch {
        setStatus({ kind: 'error', message: 'The server could not be reached. Your changes are still here; try again.' });
      } finally {
        inFlight.current = false;
      }
    });
  };

  const discard = () => {
    setValues(baseline);
    setErrors({});
    setStatus({ kind: 'idle' });
  };

  const reset = useCallback((next: V) => {
    setBaseline(next);
    setValues(next);
    setErrors({});
  }, []);

  return {
    values,
    baseline,
    errors,
    dirty,
    pending,
    status,
    get: (path) => getIn(values, path),
    set,
    update,
    errorFor: (path) => errors[pathKey(path)],
    text: (path) => {
      const value = getIn(values, path);
      return {
        value: typeof value === 'string' || typeof value === 'number' ? String(value) : '',
        onChange: (next: string) => set(path, next),
        error: errors[pathKey(path)],
      };
    },
    submit,
    discard,
    reset,
  };
}

const LEAVE_MESSAGE = 'You have unsaved changes. Leave without saving?';

/**
 * Asks before unsaved edits are lost: on reload/close (`beforeunload`), on
 * in-app link clicks (a capture listener runs before Next's Link handler), and
 * on browser back/forward (`guardHistory`).
 */
export function useUnsavedChangesGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    const releaseHistory = guardHistory(window, () => window.confirm(LEAVE_MESSAGE));
    return () => {
      releaseHistory();
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);
}
