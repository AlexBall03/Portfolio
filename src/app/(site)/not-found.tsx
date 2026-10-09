import Link from 'next/link';
import { Screen } from '@/components/layout/Screen';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { SystemState } from '@/components/ui/SystemState';
import { copy } from '@/config/copy';

/** The site's 404. Search engines get a 404 status and noindex. */
export default function NotFound() {
  const t = copy.notFound;

  return (
    <Screen>
      <title>{t.title}</title>
      <meta name="robots" content="noindex, follow" />
      <SystemState
        code={t.code}
        title={t.heading}
        lead={t.lead}
        actions={
          <>
            <Link href="/" className={buttonStyles()}>
              {t.home} <Icon name="arrowRight" />
            </Link>
            <Link href="/projects" className={buttonStyles({ variant: 'secondary' })}>
              {t.projects}
            </Link>
          </>
        }
      />
    </Screen>
  );
}
