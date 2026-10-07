import type { ReactNode } from 'react';

/** The frame every screen renders in: clears the fixed command bar and fades in. */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col pt-nav motion-safe:animate-screen-in">{children}</div>;
}
