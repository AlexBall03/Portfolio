'use client';

import { type DragEvent, type ReactNode, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { ItemControls } from './fields';

interface SortableListProps<T extends { key: string }> {
  items: T[];
  onChange: (items: T[]) => void;
  /** Short name for an item, for its controls' accessible names and move announcements. */
  itemLabel: (item: T, index: number) => string;
  children: (item: T, index: number) => ReactNode;
  /** Remove buttons are shown only when given. */
  onRemove?: (index: number) => void;
  disabled?: boolean;
  emptyLabel?: string;
}

const move = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};

/**
 * A reorderable list: drag an item by its handle, or use its move up / move
 * down buttons (keyboard and touch). Moves are announced to screen readers.
 * Nothing is saved here; the owning editor saves the new order explicitly.
 */
export function SortableList<T extends { key: string }>({
  items,
  onChange,
  itemLabel,
  children,
  onRemove,
  disabled,
  emptyLabel,
}: SortableListProps<T>) {
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const moveTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    onChange(move(items, from, to));
    setAnnouncement(`${itemLabel(items[from]!, from)} moved to position ${to + 1} of ${items.length}.`);
  };

  const endDrag = () => {
    dragFrom.current = null;
    setDragging(null);
    setGrabbed(null);
    setOver(null);
  };

  const onDrop = (event: DragEvent, to: number) => {
    event.preventDefault();
    if (dragFrom.current !== null) moveTo(dragFrom.current, to);
    endDrag();
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && emptyLabel && (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-body-sm text-fg-muted">
          {emptyLabel}
        </p>
      )}
      <ol className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li
            key={item.key}
            // Only the handle starts a drag, so text and fields inside the item stay usable.
            draggable={!disabled && grabbed === item.key}
            onDragStart={(event) => {
              dragFrom.current = i;
              setDragging(i);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', item.key);
            }}
            onDragOver={(event) => {
              if (dragFrom.current === null) return;
              event.preventDefault();
              setOver(i);
            }}
            onDrop={(event) => onDrop(event, i)}
            onDragEnd={endDrag}
            className={cn(
              'flex items-center gap-3 rounded-md border bg-surface-inset/40 py-2 pr-2 pl-1.5 transition-[border-color,opacity] duration-150',
              over === i && dragging !== null && dragging !== i ? 'border-brand' : 'border-line',
              dragging === i && 'opacity-50',
            )}
          >
            <span
              aria-hidden="true"
              title="Drag to reorder"
              onPointerDown={() => setGrabbed(item.key)}
              onPointerUp={() => setGrabbed(null)}
              className={cn(
                'grid h-8 w-5 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-fg-faint hover:text-fg active:cursor-grabbing',
                disabled && 'pointer-events-none opacity-40',
              )}
            >
              <svg viewBox="0 0 8 14" className="h-3.5 w-2" fill="currentColor">
                {[1, 7, 13].flatMap((y) => [1, 7].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" />))}
              </svg>
            </span>
            <span aria-hidden="true" className="w-5 shrink-0 font-mono text-micro text-accent-fg tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">{children(item, i)}</div>
            <ItemControls
              label={itemLabel(item, i)}
              index={i}
              count={items.length}
              onMove={moveTo}
              onRemove={onRemove && (() => onRemove(i))}
              disabled={disabled}
            />
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
