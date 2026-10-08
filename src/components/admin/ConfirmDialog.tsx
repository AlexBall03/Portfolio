'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { lockScroll, unlockScroll } from '@/lib/client/scroll-lock';
import { CONTROL, FieldError } from './form/fields';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Destructive actions use the danger style. */
  tone?: 'danger' | 'default';
  /** When set, Confirm stays disabled until this exact text is typed. */
  requireText?: string;
  pending?: boolean;
  error?: string;
}

/**
 * A modal confirmation on the native <dialog> (focus trap, Escape, inert
 * page). Pinned to the viewport's center (`fixed`: `.glass-strong` would
 * otherwise make it `relative` and leave it at the document's top) with the
 * page scroll-locked behind it. Cancel is focused first, so Enter never
 * confirms by accident; destructive actions can require typing a name.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = 'danger',
  requireText,
  pending,
  error,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    return unlockScroll;
  }, [open]);

  const blocked = pending || (requireText !== undefined && typed.trim() !== requireText);
  const cancel = () => {
    setTyped('');
    onCancel();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) cancel();
      }}
      className="glass-strong fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-lg p-0 text-fg backdrop:bg-canvas/70 backdrop:backdrop-blur-sm open:animate-overlay-in"
    >
      <form
        className="flex flex-col gap-5 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!blocked) onConfirm();
        }}
      >
        <h2 id={`${id}-title`} className="text-h3">
          {title}
        </h2>
        <div id={`${id}-body`} className="flex flex-col gap-3 text-body-sm text-fg-muted">
          {children}
        </div>
        {requireText !== undefined && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-confirm`} className="text-body-sm font-medium text-fg">
              Type <span className="font-mono text-danger">{requireText}</span> to confirm
            </label>
            <input
              id={`${id}-confirm`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              aria-invalid={Boolean(error) || undefined}
              className={CONTROL}
            />
          </div>
        )}
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={cancel}
            disabled={pending}
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={blocked}
            className={buttonStyles({ variant: tone === 'danger' ? 'danger' : 'primary', size: 'sm' })}
          >
            {pending && (
              <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
