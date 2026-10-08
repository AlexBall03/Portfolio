import type { CSSProperties } from 'react';

/**
 * The console's two placements share one row language: compact, icon-led
 * rows inset from the edges, the current page a brand-tinted pill. The rail
 * is dense; the drawer gets taller rows for touch and the site gutter so it
 * lines up with the top bar.
 */
export type AdminPlacement = 'rail' | 'drawer';

export const adminInset: Record<AdminPlacement, string> = { rail: 'px-3', drawer: 'px-gutter' };

/** A navigation-style row (nav items, view site). */
export const adminRow = (placement: AdminPlacement) =>
  placement === 'drawer' ? 'h-11 gap-3.5 px-3 text-body' : 'h-9 gap-3 px-3 text-body-sm';

/** Small group heading above a run of rows. */
export const adminGroupTitle = 'px-3 text-label font-medium text-fg-faint';

/** Square icon-only button (account actions). */
export const adminIconButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:opacity-60 [&_svg]:size-4';

/** Drawer-only entrance stagger (`.drawer-item`, see system.css). */
export const stagger = (i: number) => ({ '--i': i }) as CSSProperties;
