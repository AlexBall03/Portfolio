import { PLATFORM_ICONS } from '@/components/layout/types';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
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
    <section id="contact" className="band" aria-labelledby="contact-title">
      <div className="wrap">
        <Reveal className="card contact-card">
          <div className="contact-grid">
            <div className="contact-left">
              <div className="eyebrow">
                <span className="idx">08</span>
                <span className="bar" />
                <span>{section.eyebrow}</span>
              </div>
              <h1 id="contact-title" className="contact-title" style={{ marginTop: 18 }}>
                {section.title}
              </h1>
              {section.body && <p className="lead">{section.body}</p>}
              <div className="contact-channels">
                {channels.map((c) => {
                  const external = c.href.startsWith('http');
                  return (
                    <a
                      className="channel"
                      key={c.key}
                      href={c.href}
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      <span className="ch-ic">
                        <Icon name={c.icon} />
                      </span>
                      <div>
                        <div className="ch-k">{c.label}</div>
                        <div className="ch-v">{c.value}</div>
                      </div>
                      <span className="ch-go">
                        <Icon name="arrowUpRight" style={{ width: 17, height: 17 }} />
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              <ContactForm email={email} t={t} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
