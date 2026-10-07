import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/SectionHead';
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
  return (
    <section id="projects" className="band" aria-labelledby="projects-title">
      <div className="wrap">
        <SectionHead index="04" content={section} as="h1" id="projects-title" />
        {projects.length ? (
          <div className="proj-grid">
            {projects.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} locale={locale} t={t} />
            ))}
          </div>
        ) : (
          <p className="dim">{t.empty}</p>
        )}

        {githubUrl && (
          <Reveal>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 28 }}>
              <a className="link-arrow" href={githubUrl} target="_blank" rel="noopener noreferrer">
                {t.allRepos} <Icon name="arrowUpRight" />
              </a>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
