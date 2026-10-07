import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { Reveal } from '@/components/ui/Reveal';
import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import type { Profile } from '../types';

interface HeroProps {
  profile: Profile;
  monogram: string;
  locale: Locale;
  t: Dictionary['hero'];
}

/** Splits "Alexander D. Ball" into "Alexander" / "D. Ball" for the two-line display name. */
function displayName(fullName: string): [string, string] {
  const [first = fullName, ...rest] = fullName.split(' ');
  return [first, rest.join(' ')];
}

export function Hero({ profile, monogram, locale, t }: HeroProps) {
  const [first, rest] = displayName(profile.fullName);

  return (
    <section id="home" className="hero band">
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-left">
            {profile.openToWork && (
              <Reveal className="status-badge">
                <span className="status-dot" />
                {profile.availabilityText}
              </Reveal>
            )}

            <Reveal delay={110}>
              <h1 className="display" style={{ marginTop: 26 }}>
                {first}
                {rest && (
                  <>
                    <br />
                    {rest}
                  </>
                )}
              </h1>
            </Reveal>

            <Reveal delay={170}>
              <div className="role">
                <span className="label">{profile.title}</span>
                <span className="rule" />
              </div>
            </Reveal>

            <Reveal delay={230}>
              <p className="statement">{profile.statement}</p>
            </Reveal>

            <Reveal delay={300}>
              <div className="hero-cta">
                <Link href={localizedPath(locale, '/contact')} className="btn btn-primary">
                  {t.ctaContact} <Icon name="arrowRight" />
                </Link>
                <Link href={localizedPath(locale, '/projects')} className="btn btn-ghost">
                  {t.ctaProjects}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={360}>
              <dl className="hero-meta">
                <div className="m">
                  <dt className="k">{t.focusLabel}</dt>
                  <dd className="v">{profile.hero.focus}</dd>
                </div>
                <div className="m">
                  <dt className="k">{t.stackLabel}</dt>
                  <dd className="v">{profile.hero.stackLine}</dd>
                </div>
                <div className="m">
                  <dt className="k">{t.basedLabel}</dt>
                  <dd className="v">
                    {profile.locationLabel}
                    <span className="hero-meta-sep" aria-hidden="true">
                      {' · '}
                    </span>
                    <LocalTime locale={LOCALE_TAGS[locale].intl} timeZone={profile.timeZone} />
                  </dd>
                </div>
              </dl>
            </Reveal>
          </div>

          <Reveal delay={200} className="headshot-wrap">
            <div className="headshot-frame">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              {profile.headshot && (
                <Image
                  className="headshot-img"
                  src={profile.headshot.src}
                  alt={profile.headshot.alt}
                  width={profile.headshot.width ?? 1200}
                  height={profile.headshot.height ?? 1200}
                  sizes="(max-width: 880px) 90vw, 460px"
                  priority
                />
              )}
              <div className="headshot-grad" />
              <div className="headshot-cap">
                <div>
                  <div className="nm">{profile.fullName}</div>
                  <div className="rl">{profile.title}</div>
                </div>
                <div className="sig">{monogram}</div>
              </div>
            </div>
            {profile.hero.chips.map((chip, i) => (
              <div key={chip} className={`float-chip ${i % 2 === 0 ? 'tl' : 'br'}`}>
                <span className="dt" /> {chip}
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
