'use client';

import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { buttonStyles } from '@/components/ui/button-styles';
import { cn } from '@/lib/cn';
import type { Editor } from './use-editor';

const savedTime = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/**
 * The form element and sticky save bar for one editor. Fields are disabled
 * while saving (a fieldset), Save is disabled until something changes, and
 * Ctrl/⌘+S saves. Status changes are announced politely; failures assertively.
 */
export function EditorForm<V>({ editor, label, children }: { editor: Editor<V>; label: string; children: ReactNode }) {
  const { dirty, pending, status } = editor;
  const statusRef = useRef<HTMLParagraphElement>(null);

  // A failed save moves focus to the message, which links the eye to the first error.
  useEffect(() => {
    if (status.kind === 'error') statusRef.current?.focus();
  }, [status]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    editor.submit();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      editor.submit();
    }
  };

  let message: ReactNode;
  if (pending) message = 'Saving…';
  else if (status.kind === 'error') message = status.message;
  else if (dirty) message = 'Unsaved changes';
  else if (status.kind === 'saved') message = <>Saved at {savedTime(status.at)} · the public site is updated</>;
  else message = 'All changes saved';

  return (
    <form aria-label={label} noValidate onSubmit={onSubmit} onKeyDown={onKeyDown} aria-busy={pending} className="flex flex-col gap-6">
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        {children}
      </fieldset>

      <div className="glass-strong sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          ref={statusRef}
          tabIndex={-1}
          role={status.kind === 'error' && !pending ? 'alert' : 'status'}
          className={cn(
            'flex items-center gap-2 text-body-sm outline-none',
            status.kind === 'error' && !pending ? 'text-danger' : dirty ? 'text-warning' : 'text-fg-muted',
          )}
        >
          {status.kind === 'error' && !pending ? (
            <Icon name="alert" className="size-4 shrink-0" />
          ) : status.kind === 'saved' && !dirty ? (
            <Icon name="check" className="size-4 shrink-0 text-success" />
          ) : (
            <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', dirty ? 'bg-warning' : 'bg-fg-faint')} />
          )}
          {message}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={editor.discard}
            disabled={!dirty || pending}
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            Discard
          </button>
          <button type="submit" disabled={!dirty || pending} className={buttonStyles({ size: 'sm', className: 'min-w-28' })}>
            {pending && (
              <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
            )}
            {pending ? 'Saving' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

/** A titled group of fields inside an editor. */
export function EditorSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Surface as="section" variant="raised" radius="md" className={className}>
      <header className="flex flex-col gap-1 border-b border-line px-5 py-3.5">
        <h2 className="font-mono text-micro tracking-[0.16em] text-fg-muted uppercase">{title}</h2>
        {description && <p className="text-body-sm text-fg-muted">{description}</p>}
      </header>
      <div className="flex flex-col gap-5 px-5 py-5">{children}</div>
    </Surface>
  );
}
