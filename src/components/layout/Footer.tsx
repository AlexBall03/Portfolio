import { Container } from '@/components/ui/Container';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LOCALE_TAGS } from '@/i18n/config';
import { BrandMark } from './BrandMark';
import { FooterNav } from './FooterNav';
import { LocaleSwitch, ThemeToggle } from './Preferences';
import { PLATFORM_ICONS, type ChromeData } from './types';

/** Build timestamp, inlined by next.config.ts: when the live site was deployed. */
const BUILD_TIME = process.env.BUILD_TIME ?? '';

const COLUMN_TITLE = 'font-mono text-micro tracking-[0.16em] text-fg-faint uppercase';

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
    <footer className="relative z-[1] border-t border-line bg-canvas-subtle/40">
      <span aria-hidden="true" className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
      <Container>
        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:py-20">
          <div className="flex flex-col gap-5 sm:col-span-2 lg:col-span-1">
            <BrandMark text={data.brandMark} className="text-h3" />
            <p className="max-w-[38ch] text-body-sm text-fg-muted">{statement}</p>
          </div>

          <FooterNav pages={data.pages} label={T.site} titleClassName={COLUMN_TITLE} />

          <div className="flex flex-col gap-4">
            <span className={COLUMN_TITLE}>{T.connect}</span>
            <ul className="flex flex-col gap-2.5">
              {links.map((l) => (
                <li key={l.key}>
                  <a
                    href={l.href}
                    {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="inline-flex items-center gap-2.5 text-body-sm text-fg-muted transition-colors hover:text-fg [&_svg]:size-4 [&_svg]:text-brand-fg"
                  >
                    <Icon name={l.icon} /> <span>{l.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-4">
            <span className={COLUMN_TITLE}>{data.dict.toggles.theme} · {data.dict.toggles.language}</span>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle t={data.dict.toggles} labelled />
              <LocaleSwitch locale={data.locale} t={data.dict.toggles} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line py-6 font-mono text-micro text-fg-faint sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {built?.getUTCFullYear()} {ownerName}
          </span>
          {updated && (
            <span>
              {T.lastUpdated}: <time dateTime={BUILD_TIME} className="text-fg-muted">{updated}</time>
            </span>
          )}
          <span>Next.js · Neon · Vercel</span>
        </div>
      </Container>
    </footer>
  );
}
