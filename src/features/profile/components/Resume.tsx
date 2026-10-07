import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Surface } from '@/components/ui/Surface';
import type { SectionContent } from '@/features/site/types';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Highlight, Profile } from '../types';
import { ResumeViewer } from './ResumeViewer';

interface ResumeProps {
  section: SectionContent;
  profile: Profile;
  highlights: Highlight[];
  t: Dictionary['resume'];
}

/** Highlights and actions in one restrained header; the PDF itself is the centerpiece. */
export function Resume({ section, profile, highlights, t }: ResumeProps) {
  const resume = profile.resume;
  const fileName = resume?.src.split('/').pop() ?? '';

  return (
    <Section id="resume" labelledBy="resume-title">
      <SectionHeader content={section} as="h1" id="resume-title" />

      <Reveal>
        <Surface variant="glass" radius="xl" className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
          {highlights.length > 0 && (
            <ul className="grid gap-6 sm:grid-cols-3">
              {highlights.map((h) => (
                <li key={h.title} className="flex gap-3">
                  <Icon name={h.icon ?? 'check'} className="mt-0.5 size-[18px] shrink-0 text-brand-fg" />
                  <div className="flex flex-col gap-1">
                    <span className="text-body-sm font-medium text-fg">{h.title}</span>
                    <span className="text-body-sm text-fg-muted">{h.body}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {resume && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <a className={buttonStyles({ className: 'w-full' })} href={resume.src} download>
                <Icon name="download" /> {t.download}
              </a>
              <a
                className={buttonStyles({ variant: 'secondary', className: 'w-full' })}
                href={resume.src}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="external" /> {t.openFull}
              </a>
            </div>
          )}
        </Surface>
      </Reveal>

      {resume && (
        <Reveal delay={100} className="mt-8">
          <Surface variant="raised" radius="xl" className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 font-mono text-label text-fg-muted">
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon name="file" className="size-4 shrink-0 text-brand-fg" />
                <span className="truncate">{fileName}</span>
              </span>
              <span className="text-fg-faint">PDF</span>
            </div>
            <div className="bg-surface-inset p-3 sm:p-6 lg:p-10">
              <ResumeViewer src={resume.src} t={t} />
            </div>
          </Surface>
        </Reveal>
      )}
    </Section>
  );
}
