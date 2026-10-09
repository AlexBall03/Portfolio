import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { SectionContent } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { toFilterable } from '../filter';
import { technologyUsage } from '../technologies';
import type { Project } from '../types';
import { ProjectCard } from './ProjectCard';
import { ProjectExplorer } from './ProjectExplorer';

interface ProjectsProps {
  section: SectionContent;
  projects: Project[];
  githubUrl: string | null;
  locale: Locale;
  t: Dictionary['projects'];
}

/**
 * The projects index: featured projects first (full-width), then the rest in
 * a grid, each group in CMS order. Every card is rendered here on the server;
 * the explorer island filters which are shown.
 */
export function Projects({ section, projects, githubUrl, locale, t }: ProjectsProps) {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  const cards = Object.fromEntries([
    ...featured.map((p, i) => [
      p.id,
      <ProjectCard key={p.id} project={p} index={i} locale={locale} t={t} reverse={i % 2 === 1} showFeatured />,
    ]),
    ...others.map((p, i) => [
      p.id,
      <ProjectCard key={p.id} project={p} index={featured.length + i} locale={locale} t={t} layout="compact" />,
    ]),
  ]);

  return (
    <Section id="projects" labelledBy="projects-title">
      <SectionHeader
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

      {projects.length === 0 ? (
        <p className="text-body-lg text-fg-muted">{t.empty}</p>
      ) : (
        <ProjectExplorer
          entries={projects.map(toFilterable)}
          cards={cards}
          technologies={technologyUsage(projects)}
          t={t}
        />
      )}
    </Section>
  );
}
