import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button-styles';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import type { SectionContent } from '../types';
import { copy } from '@/config/copy';

interface ClosingBandProps {
  section: SectionContent;
}

/** Home: one line and the next steps (contact, experience, resume). Deliberately small. */
export function ClosingBand({ section }: ClosingBandProps) {
  const nav = copy.nav;
  return (
    <section aria-labelledby="next-title" className="pt-section">
      <Container>
        <Reveal>
          {/* Top rule only: the pager below draws the next one. */}
          {/* Wide screens: the links sit on the heading's row, centered on the heading itself rather than on the whole text block. */}
          <div className="flex flex-col gap-4 border-t border-line pt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-12">
            <Eyebrow>{section.eyebrow}</Eyebrow>
            <h2 id="next-title" className="max-w-2xl text-h2 lg:col-start-1">
              {section.title}
            </h2>
            {section.subtitle && <p className="max-w-2xl text-body text-fg-muted lg:col-start-1">{section.subtitle}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-start-2 lg:row-start-2 lg:mt-0 lg:self-center">
              <Link href={'/contact'} className={buttonStyles()}>
                {nav.contact} <Icon name="arrowRight" />
              </Link>
              <Link href={'/experience'} className={buttonStyles({ variant: 'secondary' })}>
                {nav.experience}
              </Link>
              <Link href={'/resume'} className={buttonStyles({ variant: 'quiet' })}>
                {nav.resume} <Icon name="arrowRight" />
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
