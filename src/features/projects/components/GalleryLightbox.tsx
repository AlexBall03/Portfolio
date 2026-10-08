'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { MediaAsset } from '@/lib/media';

interface GalleryLightboxProps {
  images: MediaAsset[];
  /** `grid`: thumbnails in columns (gallery); `stack`: full-width figures (architecture diagrams). */
  layout?: 'grid' | 'stack';
  labels: { view: string; close: string; previous: string; next: string };
}

const fill = (template: string, n: number, count: number) =>
  template.replace('{n}', String(n)).replace('{count}', String(count));

const control =
  'grid size-11 place-items-center rounded-full border border-line-glass bg-surface-glass-strong text-fg backdrop-blur-md transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&_svg]:size-5';

/**
 * Images that open larger in a native modal `<dialog>` (focus is trapped and
 * returned by the browser; Esc closes). Arrow keys step through the set.
 * Without JavaScript the figures still render with their captions.
 */
export function GalleryLightbox({ images, layout = 'grid', labels }: GalleryLightboxProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const count = images.length;
  const current = open === null ? null : images[open];

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  const step = (by: number) => setOpen((i) => (i === null ? i : (i + by + count) % count));

  return (
    <>
      <ul className={cn(layout === 'grid' ? 'grid gap-4 sm:grid-cols-2' : 'flex flex-col gap-6')}>
        {images.map((m, i) => (
          <li key={m.src} className={cn(layout === 'grid' && count % 2 === 1 && i === 0 && 'sm:col-span-2')}>
            <figure className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={fill(labels.view, i + 1, count)}
                className={cn(
                  'group relative block w-full overflow-hidden rounded-lg border border-line bg-surface-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  layout === 'grid' ? 'aspect-video' : 'aspect-[16/9] sm:aspect-[2/1]',
                )}
              >
                <Image
                  src={m.src}
                  alt={m.alt}
                  fill
                  sizes={layout === 'grid' && !(count % 2 === 1 && i === 0) ? '(max-width: 640px) 100vw, 380px' : '(max-width: 1024px) 100vw, 780px'}
                  className={cn(
                    'transition-transform duration-500 ease-out group-hover:scale-[1.015]',
                    layout === 'grid' ? 'object-cover object-top' : 'object-contain p-4',
                  )}
                />
              </button>
              {m.caption && <figcaption className="text-body-sm text-fg-muted">{m.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current?.alt || undefined}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-fg backdrop:bg-canvas/85 backdrop:backdrop-blur-sm"
      >
        {current && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-16 sm:px-20">
            <div className="relative h-full max-h-[78vh] w-full max-w-6xl">
              <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
            </div>
            <p className="max-w-[65ch] text-center text-body-sm text-fg-muted">
              {current.caption}
              <span className="ml-3 font-mono text-micro text-fg-faint tabular-nums">
                {(open ?? 0) + 1} / {count}
              </span>
            </p>
            <button type="button" autoFocus onClick={() => setOpen(null)} aria-label={labels.close} className={cn(control, 'absolute top-4 right-4')}>
              <Icon name="x" />
            </button>
            {count > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label={labels.previous} className={cn(control, 'absolute top-1/2 left-3 -translate-y-1/2 sm:left-5')}>
                  <Icon name="arrowLeft" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label={labels.next} className={cn(control, 'absolute top-1/2 right-3 -translate-y-1/2 sm:right-5')}>
                  <Icon name="arrowRight" />
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
