import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { SectionContent } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import { cn } from '@/lib/cn';
import type { Project } from '../types';
import { ProjectCard } from './ProjectCard';

/** How many featured projects the home page previews. */
export const FEATURED_ON_HOME = 3;

interface FeaturedWorkProps {
  section: SectionContent;
  /** Published projects in CMS order; the first featured ones are shown. */
  projects: Project[];
  locale: Locale;
  t: Dictionary['projects'];
  labels: { viewAll: string; readCaseStudy: string };
}

/**
 * Home: a curated preview of the featured projects, each linking to its case
 * study. Not a second index: no filters, no GitHub data. Renders nothing when
 * no project is featured.
 */
export function FeaturedWork({ section, projects, locale, t, labels }: FeaturedWorkProps) {
  const featured = projects.filter((p) => p.featured).slice(0, FEATURED_ON_HOME);
  if (!featured.length) return null;

  const viewAll = (
    <Link href={localizedPath(locale, '/projects')} className={buttonStyles({ variant: 'quiet' })}>
      {labels.viewAll} <Icon name="arrowRight" />
    </Link>
  );

  return (
    <Section id="work" labelledBy="work-title">
      <SectionHeader content={section} id="work-title" actions={<span className="hidden lg:block">{viewAll}</span>} />
      <ul
        className={cn(
          'grid gap-6',
          featured.length === 1 ? 'max-w-xl' : featured.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {featured.map((p, i) => (
          // Three cards in two columns: the lead project takes the full-width row.
          <li key={p.id} className={cn(featured.length === 3 && i === 0 && 'md:col-span-2 lg:col-span-1')}>
            <ProjectCard project={p} index={i} locale={locale} t={t} layout="tile" headingLevel="h3" cta={labels.readCaseStudy} />
          </li>
        ))}
      </ul>
      <div className="mt-8 lg:hidden">{viewAll}</div>
    </Section>
  );
}
