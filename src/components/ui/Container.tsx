import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The site's horizontal frame: max width plus responsive gutter. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-site px-gutter', className)}>{children}</div>;
}
