'use client';

import type { ReactNode } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { cn } from '@/lib/cn';
import { ItemControls } from './fields';

interface RepeatableListProps<T extends { key: string }> {
  items: T[];
  onChange: (items: T[]) => void;
  /** A new, blank item (with a fresh client `key`). */
  create: () => T;
  /** Short name for item n (accessible names of its controls), e.g. "Role 2". */
  itemLabel: (item: T, index: number) => string;
  /** Header line for an item: its title in the current language, a status badge… */
  summary: (item: T, index: number) => ReactNode;
  children: (item: T, index: number) => ReactNode;
  addLabel: string;
  emptyLabel: string;
  max?: number;
  disabled?: boolean;
}

/**
 * An ordered, editable list of entities (roles, highlights, metrics). Order
 * here is the public order. Nothing is written until the form is saved, so
 * removing an item is undone by Discard.
 */
export function RepeatableList<T extends { key: string }>({
  items,
  onChange,
  create,
  itemLabel,
  summary,
  children,
  addLabel,
  emptyLabel,
  max,
  disabled,
}: RepeatableListProps<T>) {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-body-sm text-fg-muted">
          {emptyLabel}
        </p>
      )}
      <ol className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={item.key} className="rounded-md border border-line bg-surface-inset/40">
            <div className="flex items-center gap-3 border-b border-line py-2 pr-2 pl-4">
              <span aria-hidden="true" className="font-mono text-micro text-accent-fg tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">{summary(item, i)}</div>
              <ItemControls
                label={itemLabel(item, i)}
                index={i}
                count={items.length}
                onMove={move}
                onRemove={() => onChange(items.filter((_, j) => j !== i))}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-col gap-4 p-4">{children(item, i)}</div>
          </li>
        ))}
      </ol>
      {(max === undefined || items.length < max) && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...items, create()])}
          className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }), 'self-start')}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

/** A client key for an unsaved item (replaced by the row id after saving). */
export const newKey = () => `new-${crypto.randomUUID()}`;
