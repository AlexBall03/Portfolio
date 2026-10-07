import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { SectionContent } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Project } from '../types';
import { ProjectCard } from './ProjectCard';

interface ProjectsProps {
  section: SectionContent;
  projects: Project[];
  githubUrl: string | null;
  locale: Locale;
  t: Dictionary['projects'];
}

export function Projects({ section, projects, githubUrl, locale, t }: ProjectsProps) {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);

  return (
    <Section id="projects" labelledBy="projects-title">
      <SectionHeader
        index="04"
        content={section}
        as="h1"
        id="projects-title"
        actions={
          githubUrl && (
            <a className={buttonStyles({ variant: 'quiet' })} href={githubUrl} target="_blank" rel="noopener noreferrer">
              {t.allRepos} <Icon name="arrowUpRight" />
            </a>
          )
        }
      />

      {projects.length === 0 && <p className="text-body-lg text-fg-muted">{t.empty}</p>}

      {featured.length > 0 && (
        <div className="flex flex-col gap-8">
          {featured.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} locale={locale} t={t} reverse={i % 2 === 1} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {others.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={featured.length + i} locale={locale} t={t} layout="compact" />
          ))}
        </div>
      )}
    </Section>
  );
}
