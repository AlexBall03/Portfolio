import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { Surface } from '@/components/ui/Surface';
import { copy, fill } from '@/config/copy';
import { SUPPORT_PATH } from '@/config/navigation';
import { INTL_LOCALE } from '@/config/site';
import { getSponsorList } from '../queries';
import { previewOf, sponsorshipVisibility } from '../sponsors';
import type { SponsorshipSettings } from '../types';
import { SponsorAvatars } from './SponsorAvatars';
import { SponsorCta } from './SponsorCta';

const t = copy.sponsorship;

export const sponsorCount = (count: number) =>
  count === 1 ? t.countOne : fill(t.countMany, { count: count.toLocaleString(INTL_LOCALE) });

interface SponsorSectionProps {
  settings: SponsorshipSettings;
  /** The sponsor preview (streamed by the page), or nothing. */
  preview?: ReactNode;
}

/**
 * Home: why sponsorship helps and the GitHub Sponsors button, in one glass
 * panel. The panel is complete on its own; the sponsor preview only adds a row
 * to it, so it reads the same with no sponsors, with one, or while GitHub is down.
 */
export function SponsorSection({ settings, preview }: SponsorSectionProps) {
  const visibility = sponsorshipVisibility(settings);
  if (!visibility.home) return null;
  return (
    <Section id="sponsor" labelledBy="sponsor-title">
      <Reveal>
        <Surface variant="glass" radius="xl" className="p-6 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>{t.eyebrow}</Eyebrow>
              <h2 id="sponsor-title" className="text-h2">
                {settings.heading}
              </h2>
              <p className="text-body text-fg-muted">{settings.description}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
              <SponsorCta href={settings.sponsorsUrl} label={settings.ctaLabel} />
              {visibility.supportPage && (
                <Link href={SUPPORT_PATH} className={buttonStyles({ variant: 'quiet' })}>
                  {t.learnMore} <Icon name="arrowRight" />
                </Link>
              )}
            </div>
          </div>
          {preview}
        </Surface>
      </Reveal>
    </Section>
  );
}

/**
 * The first few public sponsors, as a row inside the home panel. Renders
 * nothing when the list is off, empty, or unavailable: the home page never
 * shows an empty grid, and never depends on GitHub.
 */
export async function SponsorPreview({ settings }: { settings: SponsorshipSettings }) {
  const list = await getSponsorList();
  if (list.state !== 'ok' || !list.sponsors.length) return null;
  const { shown, more } = previewOf(list.sponsors, settings.homeSponsorLimit);
  const linkToAll = more > 0 && sponsorshipVisibility(settings).supportPage;

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:gap-8">
      <h3 className="shrink-0 font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">
        {settings.showSponsorCount ? sponsorCount(list.sponsors.length) : t.sponsorsEyebrow}
      </h3>
      <SponsorAvatars sponsors={shown} />
      {linkToAll && (
        <Link href={`${SUPPORT_PATH}#sponsors`} className={buttonStyles({ variant: 'quiet', className: 'self-start sm:ml-auto sm:self-center' })}>
          {t.viewAll} <Icon name="arrowRight" />
        </Link>
      )}
    </div>
  );
}
