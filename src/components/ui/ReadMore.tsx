'use client';

import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { buttonStyles } from './button-styles';
import { Icon } from './Icon';

interface ReadMoreProps {
  /** One long-form block (e.g. `RichText`); its child blocks are the paragraphs measured. */
  children: ReactNode;
  moreLabel: string;
  lessLabel: string;
  /** The text is cut halfway through this block (1-based). */
  cutAt?: number;
}

/**
 * Long-form text that starts collapsed: it fades out partway through a
 * paragraph, with a button to read the rest. Everything stays in the document
 * (search engines, screen readers, find-in-page); only the height is limited,
 * and focusing a link in the hidden part opens it. Server children pass through.
 */
export function ReadMore({ children, moreLabel, lessLabel, cutAt = 3 }: ReadMoreProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Until measured (and without JavaScript) a fixed height stands in.
  const [clamp, setClamp] = useState<number | null>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    // Remeasured on resize: where "halfway through paragraph three" falls depends on the line length.
    const observer = new ResizeObserver(() => {
      const block = box.firstElementChild?.children[cutAt - 1];
      if (!block) return;
      const rect = block.getBoundingClientRect();
      setClamp(Math.round(rect.top - box.getBoundingClientRect().top + rect.height / 2));
    });
    observer.observe(box);
    if (box.firstElementChild) observer.observe(box.firstElementChild);
    return () => observer.disconnect();
  }, [cutAt]);

  const toggle = () => {
    // Closing from the end of a long text: return to its start instead of leaving the reader far below it.
    if (open) ref.current?.closest('section')?.scrollIntoView({ block: 'start' });
    setOpen(!open);
  };

  return (
    <div className="flex flex-col items-start gap-5">
      <div
        ref={ref}
        id={id}
        onFocusCapture={() => setOpen(true)}
        // The cut is a runtime measurement, so it travels as a custom property.
        style={clamp === null ? undefined : ({ '--clamp': `${clamp}px` } as CSSProperties)}
        className={cn(
          !open &&
            'max-h-[var(--clamp,26rem)] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_calc(100%-5rem),transparent)]',
        )}
      >
        {children}
      </div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={toggle} className={buttonStyles({ variant: 'quiet' })}>
        {open ? lessLabel : moreLabel} <Icon name={open ? 'arrowUp' : 'arrowDown'} />
      </button>
    </div>
  );
}
