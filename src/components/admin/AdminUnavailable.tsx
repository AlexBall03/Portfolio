import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button-styles';
import { SystemState } from '@/components/ui/SystemState';

/**
 * Shown on every admin URL when Clerk / the admin ID aren't configured.
 * Production gets no detail; development names the missing variables
 * (names only, never values).
 */
export function AdminUnavailable({ detail }: { detail?: string }) {
  return (
    <main id="main" className="relative z-[1] flex flex-1 flex-col">
      <SystemState
        code="503"
        title="Admin unavailable"
        lead="Authentication isn't configured for this deployment, so the admin is switched off."
        actions={
          <Link href="/" className={buttonStyles({ variant: 'secondary' })}>
            Back to the site
          </Link>
        }
      />
      {detail && (
        <p className="mx-auto -mt-12 mb-16 max-w-[60ch] px-gutter text-center font-mono text-micro text-fg-faint">
          {detail}. See docs/admin-setup.md.
        </p>
      )}
    </main>
  );
}
