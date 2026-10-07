'use client';

import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { Dictionary } from '@/i18n/get-dictionary';

/** A link annotation, positioned in percentages of the page so it scales with it. */
interface PageLink {
  href: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

const LETTER_ASPECT = 8.5 / 11;
const MAX_PIXEL_RATIO = 3;

/**
 * The resume is always exactly one page, so this draws page 1 to a canvas sized
 * to its own aspect ratio: no inner scrolling, and no wheel/touch handling, so
 * scrolling over it always scrolls the page. pdf.js loads only near the viewport.
 */
export function ResumeViewer({ src, t }: { src: string; t: Dictionary['resume'] }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [aspect, setAspect] = useState(LETTER_ASPECT);
  const [links, setLinks] = useState<PageLink[]>([]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(frame);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    let disposed = false;
    let destroyDoc: (() => void) | undefined;
    let page: PDFPageProxy | undefined;
    let task: RenderTask | undefined;
    let drawnWidth = 0;
    let timer = 0;

    const draw = async () => {
      const width = frame.clientWidth;
      if (!page || disposed || width === 0 || width === drawnWidth) return;
      drawnWidth = width;
      task?.cancel();
      const base = page.getViewport({ scale: 1 });
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const viewport = page.getViewport({ scale: (width * ratio) / base.width });
      // Draw offscreen first so a resize never flashes a blank canvas.
      const buffer = document.createElement('canvas');
      buffer.width = Math.floor(viewport.width);
      buffer.height = Math.floor(viewport.height);
      task = page.render({ canvas: buffer, viewport });
      try {
        await task.promise;
      } catch {
        return; // Cancelled by a newer draw.
      }
      if (disposed) return;
      canvas.width = buffer.width;
      canvas.height = buffer.height;
      canvas.getContext('2d')?.drawImage(buffer, 0, 0);
      setDrawn(true);
    };

    const resize = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 150);
    });

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const loading = pdfjs.getDocument({ url: src });
        destroyDoc = () => void loading.destroy();
        const doc = await loading.promise;
        if (disposed) return;
        page = await doc.getPage(1);
        if (disposed) return;

        const base = page.getViewport({ scale: 1 });
        const annotations: Array<{ subtype?: string; url?: string; rect?: number[] }> = await page.getAnnotations();
        if (disposed) return;
        setAspect(base.width / base.height);
        setLinks(
          annotations.flatMap((a) => {
            if (a.subtype !== 'Link' || !a.url || !a.rect) return [];
            const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = a.rect;
            const [ax, ay] = base.convertToViewportPoint(x1, y1) as [number, number];
            const [bx, by] = base.convertToViewportPoint(x2, y2) as [number, number];
            return [
              {
                href: a.url,
                left: (Math.min(ax, bx) / base.width) * 100,
                top: (Math.min(ay, by) / base.height) * 100,
                width: (Math.abs(bx - ax) / base.width) * 100,
                height: (Math.abs(by - ay) / base.height) * 100,
              },
            ];
          }),
        );
        await draw();
        resize.observe(frame);
      } catch {
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      resize.disconnect();
      task?.cancel();
      destroyDoc?.();
    };
  }, [near, src]);

  if (failed) {
    return (
      <p className="mx-auto max-w-md py-16 text-center text-body-sm text-fg-muted">
        {t.viewerError}{' '}
        <a className="text-brand-fg underline underline-offset-4 hover:text-fg" href={src} target="_blank" rel="noopener noreferrer">
          {t.openFull}
        </a>
      </p>
    );
  }

  return (
    <div
      ref={frameRef}
      style={{ aspectRatio: aspect }}
      className={cn(
        'relative mx-auto w-full max-w-[52rem] overflow-hidden rounded-md bg-white shadow-[0_18px_48px_-20px_oklch(0_0_0/0.55)] ring-1 ring-black/5',
        !drawn && 'motion-safe:animate-pulse',
      )}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t.viewerTitle}
        className={cn('block size-full transition-opacity duration-500 ease-standard', drawn ? 'opacity-100' : 'opacity-0')}
      />
      {drawn &&
        links.map((l) => (
          <a
            key={`${l.href}-${l.left}-${l.top}`}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={l.href.replace(/^mailto:/, '')}
            className="absolute rounded-sm transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand"
            style={{ left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, height: `${l.height}%` }}
          />
        ))}
      <a href={src} className="sr-only">
        {t.openFull}
      </a>
    </div>
  );
}
