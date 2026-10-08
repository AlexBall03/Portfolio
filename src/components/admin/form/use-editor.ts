'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { FieldErrors, MutationResult } from '@/lib/cms/result';
import { clearErrorsAt, deepEqual, getIn, type Path, pathKey, setIn } from '@/lib/cms/values';

export type EditorStatus =
  | { kind: 'idle' }
  | { kind: 'saved'; at: string }
  | { kind: 'error'; message: string };

export interface Editor<V> {
  values: V;
  /** Server-reported errors, keyed by path (`translations.es.title`). */
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
  submit: () => void;
  discard: () => void;
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

  const submit = () => {
    if (inFlight.current || !dirty) return;
    inFlight.current = true;
    const submitted = values;
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

  return {
    values,
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
  };
}

const LEAVE_MESSAGE = 'You have unsaved changes. Leave without saving?';

/**
 * Asks before unsaved edits are lost: on reload/close (`beforeunload`) and on
 * in-app link clicks (a capture listener runs before Next's Link handler).
 * Browser back/forward within the app is not interceptable and isn't covered.
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
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);
}
