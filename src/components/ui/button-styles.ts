import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-standard ' +
  'disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'rounded-md bg-brand text-on-brand shadow-brand hover:bg-brand-hover active:translate-y-px hover:[&_svg:last-child]:translate-x-0.5',
  secondary:
    'rounded-md border border-line-strong bg-surface-raised/50 text-fg hover:border-brand/45 hover:bg-surface-raised active:translate-y-px',
  ghost: 'rounded-md text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
  quiet: 'rounded-sm text-brand-fg hover:text-fg hover:[&_svg:last-child]:translate-x-0.5',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-body-sm',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-12 px-6 text-body',
};

/** Shared button look for <button>, <a>, and <Link>, so all three stay identical. */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  // Quiet buttons are inline text actions: no box, so no box sizing.
  const sizing = variant === 'quiet' ? 'gap-1.5 text-body-sm' : SIZES[size];
  return cn(BASE, VARIANTS[variant], sizing, className);
}
