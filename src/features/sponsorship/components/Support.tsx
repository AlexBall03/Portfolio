import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { Surface } from '@/components/ui/Surface';
import { copy } from '@/config/copy';
import { getSponsorList } from '../queries';
import type { SponsorshipSettings } from '../types';
import { SponsorAvatars } from './SponsorAvatars';
import { SponsorCta } from './SponsorCta';
import { sponsorCount } from './SponsorSection';

const t = copy.sponsorship;

interface SupportProps {
  settings: SponsorshipSettings;
  /** The sponsors block (streamed by the page), or nothing when sponsor display is off. */
  sponsors?: ReactNode;
}

/** The support page: what sponsorship is for, the GitHub Sponsors button, and the public sponsors. */
export function Support({ settings, sponsors }: SupportProps) {
  const items = settings.supportItems;
  return (
    <>
      <Section id="support" labelledBy="support-title">
        <div className={items.length ? 'grid items-start gap-14 lg:grid-cols-2 lg:gap-20' : undefined}>
          <Reveal className="flex flex-col gap-5">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h1 id="support-title" className="text-h1">
              {settings.supportTitle}
            </h1>
            <p className="max-w-[52ch] text-body-lg text-fg-muted">{settings.supportIntro}</p>
            <div className="mt-4 flex flex-col items-start gap-4">
              <SponsorCta href={settings.sponsorsUrl} label={settings.ctaLabel} size="lg" />
              <p className="text-body-sm text-fg-faint">{t.viaGithub}</p>
            </div>
          </Reveal>

          {items.length > 0 && (
            <Reveal delay={100} className="flex flex-col gap-5">
              <h2 className="font-mono text-label tracking-[0.14em] text-fg-muted uppercase">{t.supportsTitle}</h2>
              <ol className="border-b border-line">
                {items.map((item, i) => (
                  <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 border-t border-line py-5">
                    <span aria-hidden="true" className="pt-0.5 font-mono text-label text-accent-fg tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-medium text-fg">{item.title}</h3>
                      <p className="text-body-sm text-fg-muted">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}
        </div>
      </Section>
      {sponsors}
    </>
  );
}

/**
 * The public sponsors, in full. Three honest states: the list, "be the first"
 * when GitHub says there are none, and a quiet note when GitHub couldn't be
 * read (never passed off as "no sponsors"). Nothing when the display is off.
 */
export async function SupportSponsors({ settings }: { settings: SponsorshipSettings }) {
  const list = await getSponsorList();
  if (list.state === 'disabled') return null;
  const count = list.state === 'ok' ? list.sponsors.length : 0;

  return (
    <Section id="sponsors" labelledBy="sponsors-title">
      <Reveal className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Eyebrow>{t.sponsorsEyebrow}</Eyebrow>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="sponsors-title" className="text-h2">
              {list.state !== 'ok' ? t.unavailableTitle : count > 0 ? t.sponsorsTitle : t.emptyTitle}
            </h2>
            {settings.showSponsorCount && count > 0 && (
              <p className="font-mono text-label tracking-[0.14em] text-fg-faint uppercase">{sponsorCount(count)}</p>
            )}
          </div>
        </div>

        {list.state === 'ok' && count > 0 && <SponsorAvatars sponsors={list.sponsors} layout="full" />}

        {count === 0 && (
          <Surface variant="plain" radius="lg" className="flex flex-col items-start gap-5 border-dashed p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <p className="max-w-[52ch] text-body text-fg-muted">{list.state === 'ok' ? t.emptyBody : t.unavailable}</p>
            <SponsorCta href={settings.sponsorsUrl} label={settings.ctaLabel} />
          </Surface>
        )}
      </Reveal>
    </Section>
  );
}
