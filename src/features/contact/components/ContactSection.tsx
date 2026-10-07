import { PLATFORM_ICONS } from '@/components/layout/types';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { Surface } from '@/components/ui/Surface';
import type { SocialLink } from '@/features/profile/types';
import type { SectionContent } from '@/features/site/types';
import type { Dictionary } from '@/i18n/get-dictionary';
import { ContactForm } from './ContactForm';

interface ContactSectionProps {
  section: SectionContent;
  email: string;
  socials: SocialLink[];
  t: Dictionary['contact'];
}

export function ContactSection({ section, email, socials, t }: ContactSectionProps) {
  const channels: { key: string; icon: IconName; label: string; value: string; href: string }[] = [
    { key: 'email', icon: 'mail', label: t.emailLabel, value: email, href: `mailto:${email}` },
    ...socials.map((s) => ({
      key: s.platform,
      icon: PLATFORM_ICONS[s.platform],
      label: s.label,
      value: s.handle ?? s.url.replace(/^https?:\/\//, ''),
      href: s.url,
    })),
  ];

  return (
    <Section id="contact" labelledBy="contact-title">
      <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <Reveal className="flex flex-col gap-5">
          <Eyebrow>{section.eyebrow}</Eyebrow>
          <h1 id="contact-title" className="text-h1">
            {section.title}
          </h1>
          {section.body && <p className="max-w-[42ch] text-body-lg text-fg-muted">{section.body}</p>}

          <ul className="mt-6 divide-y divide-line border-y border-line">
            {channels.map((c) => {
              const external = c.href.startsWith('http');
              return (
                <li key={c.key}>
                  <a
                    href={c.href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group flex items-center gap-4 py-4"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-surface-raised/60 text-brand-fg transition-colors group-hover:border-brand/40 [&_svg]:size-[18px]">
                      <Icon name={c.icon} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">{c.label}</span>
                      <span className="truncate font-medium text-fg transition-colors group-hover:text-brand-fg">{c.value}</span>
                    </span>
                    <Icon
                      name="arrowUpRight"
                      className="ml-auto size-4 shrink-0 text-fg-faint transition-[transform,color] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg"
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </Reveal>

        <Reveal delay={100}>
          <Surface variant="glass" radius="xl" className="p-6 sm:p-9">
            <ContactForm email={email} t={t} />
          </Surface>
        </Reveal>
      </div>
    </Section>
  );
}
