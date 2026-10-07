import { Icon, type IconName } from '@/components/ui/Icon';
import { LOCALE_TAGS } from '@/i18n/config';
import { BrandMark } from './BrandMark';
import { FooterNav } from './FooterNav';
import { Preferences } from './Preferences';
import { PLATFORM_ICONS, type ChromeData } from './types';

/** Build timestamp, inlined by next.config.ts: when the live site was deployed. */
const BUILD_TIME = process.env.BUILD_TIME ?? '';

interface FooterProps {
  data: ChromeData;
  ownerName: string;
  statement: string;
}

export function Footer({ data, ownerName, statement }: FooterProps) {
  const T = data.dict.footer;
  const built = BUILD_TIME ? new Date(BUILD_TIME) : null;
  const updated = built
    ? new Intl.DateTimeFormat(LOCALE_TAGS[data.locale].intl, { dateStyle: 'long', timeZone: 'UTC' }).format(built)
    : null;

  const links: { key: string; label: string; href: string; icon: IconName }[] = [
    ...data.socials.map((s) => ({ key: s.platform, label: s.label, href: s.url, icon: PLATFORM_ICONS[s.platform] })),
    { key: 'email', label: T.email, href: `mailto:${data.email}`, icon: 'mail' },
    ...(data.resumeHref ? [{ key: 'resume', label: T.resume, href: data.resumeHref, icon: 'download' as const }] : []),
  ];

  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="f-col f-col-brand">
          <div className="f-logo">
            <BrandMark text={data.brandMark} />
          </div>
          <p className="f-statement">{statement}</p>
        </div>

        <FooterNav pages={data.pages} label={T.site} />

        <div className="f-col f-col-connect">
          <span className="f-col-title mono">{T.connect}</span>
          <div className="f-links">
            {links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <Icon name={l.icon} /> <span>{l.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="f-col f-col-prefs">
          <Preferences locale={data.locale} t={data.dict.toggles} />
        </div>
      </div>

      <div className="wrap footer-bottom">
        <div className="f-copy">
          © {built?.getUTCFullYear()} {ownerName}
        </div>
        {updated && (
          <div className="f-updated mono">
            {T.lastUpdated}: <time dateTime={BUILD_TIME}>{updated}</time>
          </div>
        )}
        <div className="f-stack mono">Next.js · Neon · Vercel</div>
      </div>
    </footer>
  );
}
