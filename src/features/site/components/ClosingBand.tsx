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
          <div className="flex flex-col gap-8 border-y border-line py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>{section.eyebrow}</Eyebrow>
              <h2 id="next-title" className="text-h2">
                {section.title}
              </h2>
              {section.subtitle && <p className="text-body text-fg-muted">{section.subtitle}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
