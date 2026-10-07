import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SurfaceVariant = 'plain' | 'raised' | 'inset' | 'glass' | 'glass-strong';

const VARIANTS: Record<SurfaceVariant, string> = {
  plain: 'border border-line',
  raised: 'border border-line bg-surface-raised/70 shadow-sm',
  inset: 'border border-line bg-surface-inset/70',
  glass: 'glass',
  'glass-strong': 'glass-strong',
};

const RADII = { md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-xl' } as const;

interface SurfaceProps {
  variant?: SurfaceVariant;
  radius?: keyof typeof RADII;
  /** Subtle lift on hover for surfaces that are themselves a link target. */
  interactive?: boolean;
  as?: 'div' | 'article' | 'section' | 'aside' | 'figure';
  className?: string;
  children: ReactNode;
}

/** The one surface primitive. Glass is a variant, not a separate component family. */
export function Surface({
  variant = 'raised',
  radius = 'lg',
  interactive = false,
  as: Tag = 'div',
  className,
  children,
}: SurfaceProps) {
  return (
    <Tag
      className={cn(
        VARIANTS[variant],
        RADII[radius],
        interactive &&
          'transition-[translate,border-color,box-shadow] duration-200 ease-standard hover:-translate-y-0.5 hover:border-line-strong',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
