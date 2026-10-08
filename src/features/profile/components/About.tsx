import { Icon } from '@/components/ui/Icon';
import { Prose } from '@/components/ui/Prose';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { SectionContent } from '@/features/site/types';
import type { Highlight, Profile, ProfileRole } from '../types';
import { RoleCycler } from './RoleCycler';

interface AboutProps {
  section: SectionContent;
  profile: Profile;
  roles: ProfileRole[];
  differentiators: Highlight[];
}

export function About({ section, profile, roles, differentiators }: AboutProps) {
  return (
    <Section id="about" labelledBy="about-title">
      <SectionHeader content={section} id="about-title" />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        {roles.length > 0 && (
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <RoleCycler roles={roles} />
            </div>
          </Reveal>
        )}
        <Reveal delay={80}>
          <Prose paragraphs={profile.about} lead />
        </Reveal>
      </div>

      {differentiators.length > 0 && (
        <div className="mt-20 lg:mt-28">
          {section.aside && (
            <Reveal>
              <h3 className="font-mono text-label tracking-[0.16em] text-fg-faint uppercase">{section.aside}</h3>
            </Reveal>
          )}
          <ol className="mt-6 grid gap-x-14 md:grid-cols-2">
            {differentiators.map((d, i) => (
              <li key={d.title}>
                <Reveal delay={(i % 2) * 60} className="flex h-full gap-5 border-t border-line py-7">
                  <span className="pt-1 font-mono text-label text-accent-fg">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex min-w-0 flex-col gap-2">
                    <h4 className="flex items-center gap-2.5 text-h3">
                      {d.icon && <Icon name={d.icon} className="size-[18px] shrink-0 text-brand-fg" />}
                      {d.title}
                    </h4>
                    <p className="text-body-sm text-fg-muted">{d.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Section>
  );
}
