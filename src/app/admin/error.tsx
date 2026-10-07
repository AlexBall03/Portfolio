'use client';

import { useEffect } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { SystemState } from '@/components/ui/SystemState';

/** Admin error boundary: the same system state as the public site, with a retry. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="relative z-[1] flex flex-1 flex-col">
      <SystemState
        code="500"
        title="Something went wrong"
        lead={error.digest ? `The admin hit an unexpected error (ref ${error.digest}).` : 'The admin hit an unexpected error.'}
        actions={
          <button type="button" className={buttonStyles()} onClick={reset}>
            Try again
          </button>
        }
      />
    </main>
  );
}
