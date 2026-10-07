import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { SystemState } from '@/components/ui/SystemState';

/** Neutral 404 for admin URLs. Says nothing about who may see what. */
export default function AdminNotFound() {
  return (
    <main id="main" className="relative z-[1] flex flex-1 flex-col">
      <SystemState
        code="404"
        title="Page not found"
        lead="There's nothing at this address."
        actions={
          <Link href="/" className={buttonStyles()}>
            Back to the site <Icon name="arrowRight" />
          </Link>
        }
      />
    </main>
  );
}
