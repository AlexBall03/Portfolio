import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button-styles';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import type { SectionContent } from '../types';

interface ClosingBandProps {
  section: SectionContent;
  locale: Locale;
  nav: Dictionary['nav'];
}

/** Home: one line and the next steps (contact, experience, resume). Deliberately small. */
export function ClosingBand({ section, locale, nav }: ClosingBandProps) {
  return (
    <section aria-labelledby="next-title" className="pt-section">
      <Container>
        <Reveal>
          <div className="flex flex-col gap-8 border-y border-line py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>{section.eyebrow}</Eyebrow>
              <h2 id="next-title" className="text-h2">
                {section.title}
              </h2>
              {section.subtitle && <p className="text-body text-fg-muted">{section.subtitle}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={localizedPath(locale, '/contact')} className={buttonStyles()}>
                {nav.contact} <Icon name="arrowRight" />
              </Link>
              <Link href={localizedPath(locale, '/experience')} className={buttonStyles({ variant: 'secondary' })}>
                {nav.experience}
              </Link>
              <Link href={localizedPath(locale, '/resume')} className={buttonStyles({ variant: 'quiet' })}>
                {nav.resume} <Icon name="arrowRight" />
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
