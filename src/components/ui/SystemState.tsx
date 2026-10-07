import type { ReactNode } from 'react';
import { Container } from './Container';

interface SystemStateProps {
  /** Large mono code, e.g. "404". */
  code?: string;
  title: string;
  lead: string;
  actions?: ReactNode;
}

/** Full-height state for 404 / error pages, in the same language as the rest of the site. */
export function SystemState({ code, title, lead, actions }: SystemStateProps) {
  return (
    <section className="flex flex-1 items-center py-section">
      <Container className="flex flex-col items-center gap-6 text-center">
        {code && (
          <p aria-hidden="true" className="flex flex-col items-center gap-6 font-mono text-[clamp(4.5rem,3rem+8vw,8rem)] leading-none font-medium tracking-[-0.06em] text-fg-faint/60">
            {code}
            <span className="h-px w-16 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </p>
        )}
        <h1 className="text-h1">{title}</h1>
        <p className="max-w-[48ch] text-body-lg text-fg-muted">{lead}</p>
        {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
      </Container>
    </section>
  );
}
