import type { CSSProperties } from 'react';

/**
 * The console's two placements share one row language (the public drawer's):
 * full-bleed rows split by hairlines. The rail is narrow, so it uses a fixed
 * inset; the drawer uses the site gutter so it lines up with the top bar.
 */
export type AdminPlacement = 'rail' | 'drawer';

export const adminInset: Record<AdminPlacement, string> = { rail: 'px-5', drawer: 'px-gutter' };

/** Secondary rows (view site, account, sign out): quieter than navigation. */
export const adminUtilityRow =
  'flex w-full items-center gap-3 py-3 text-left text-body-sm text-fg-muted transition-colors hover:bg-fg/[0.04] hover:text-fg disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0';

/** Mono column heading, as in the footer. */
export const adminGroupTitle = 'font-mono text-micro tracking-[0.16em] text-fg-faint uppercase';

/** Drawer-only entrance stagger (`.drawer-item`, see system.css). */
export const stagger = (i: number) => ({ '--i': i }) as CSSProperties;
