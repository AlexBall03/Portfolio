import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/layout/BrandMark';
import { buttonStyles } from '@/components/ui/button-styles';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { Reveal } from '@/components/ui/Reveal';
import { Status } from '@/components/ui/Status';
import { displayName, initials } from '../display-name';
import type { Profile } from '../types';
import { copy } from '@/config/copy';

interface HeroProps {
  profile: Profile;
  monogram: string;
}

/** Small L-shaped registration marks on the portrait frame. */
function Corner({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute size-4 ${className}`} />;
}

export function Hero({ profile, monogram }: HeroProps) {
  const t = copy.hero;
  const [first, rest] = displayName(profile.fullName);
  const meta = [
    { label: t.focusLabel, value: profile.hero.focus },
    { label: t.stackLabel, value: profile.hero.stackLine },
  ];

  return (
    <section id="home" aria-labelledby="home-title" className="relative pt-page-top">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
        <div className="flex min-w-0 flex-col">
          {profile.openToWork && (
            <Reveal>
              <Status tone="success" wrap>
                {profile.availabilityText}
              </Status>
            </Reveal>
          )}

          <Reveal delay={60}>
            <h1 id="home-title" className="mt-7 text-display-xl">
              {first}
              {rest && (
                <>
                  <br />
                  <span className="text-fg/85">{rest}</span>
                </>
              )}
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-5 flex items-center gap-4 font-display text-h2 font-medium text-brand-fg">
              {profile.title}
              <span aria-hidden="true" className="h-px max-w-28 flex-1 bg-gradient-to-r from-brand/60 to-transparent" />
            </p>
          </Reveal>

          <Reveal delay={180}>
            <p className="mt-6 max-w-[40ch] text-body-lg text-fg-muted">{profile.statement}</p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={'/projects'} className={buttonStyles({ size: 'lg' })}>
                {t.ctaProjects} <Icon name="arrowRight" />
              </Link>
              <Link href={'/about'} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
                {t.ctaAbout}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <dl className="mt-12 grid gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-3">
              {meta.map((m) => (
                <div key={m.label} className="flex flex-col gap-1.5">
                  <dt className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">{m.label}</dt>
                  <dd className="text-body-sm font-medium text-fg">{m.value}</dd>
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <dt className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">{t.basedLabel}</dt>
                <dd className="text-body-sm font-medium text-fg">
                  {profile.locationLabel}
                  <span className="block font-mono text-micro font-normal text-fg-muted tabular-nums">
                    <span className="sr-only">{t.localTime}: </span>
                    <LocalTime timeZone={profile.timeZone} />
                  </span>
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <Reveal delay={150} className="relative isolate order-first mx-auto w-full max-w-[17rem] sm:max-w-[22rem] lg:order-none lg:max-w-[26rem]">
          <div aria-hidden="true" className="absolute -inset-10 -z-10 rounded-full bg-brand/20 blur-3xl" />
          <figure className="glass rounded-xl p-2.5">
            <Corner className="-top-1.5 -left-1.5 border-t-2 border-l-2 border-brand/70" />
            <Corner className="-right-1.5 -bottom-1.5 border-r-2 border-b-2 border-accent/70" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-inset">
              {!profile.headshot && (
                <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-display text-display-xl text-fg/25">
                  {initials(profile.fullName)}
                </span>
              )}
              {profile.headshot && (
                <Image
                  src={profile.headshot.src}
                  alt={profile.headshot.alt}
                  fill
                  sizes="(max-width: 640px) 272px, (max-width: 1024px) 352px, 416px"
                  className="object-cover object-[50%_18%]"
                  priority
                />
              )}
            </div>
            <figcaption className="flex items-end justify-between gap-4 px-2.5 pt-3.5 pb-1.5">
              <div className="min-w-0">
                <p className="truncate font-display text-body font-semibold text-fg">{profile.fullName}</p>
                {profile.hero.chips.length > 0 && (
                  <p className="font-mono text-micro text-fg-faint">{profile.hero.chips.join(' · ')}</p>
                )}
              </div>
              <BrandMark text={monogram} className="shrink-0 text-label" />
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}
