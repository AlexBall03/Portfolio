import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { copy } from '@/config/copy';
import { GithubPulse, GithubPulseSkeleton } from '@/features/github/components/GithubPulse';
import { Hero } from '@/features/profile/components/Hero';
import { getProfile } from '@/features/profile/queries';
import { FeaturedWork } from '@/features/projects/components/FeaturedWork';
import { getProjects } from '@/features/projects/queries';
import { usageCounts } from '@/features/projects/technologies';
import { ClosingBand } from '@/features/site/components/ClosingBand';
import { getSection, getSiteSettings } from '@/features/site/queries';
import { sectionOr } from '@/features/site/types';
import { Toolkit } from '@/features/skills/components/Toolkit';
import { getSkills } from '@/features/skills/queries';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata() {
  return topLevelPageMetadata('home', '/');
}

/**
 * Home: the hero, then three short sections (featured work, the toolkit with a
 * GitHub pulse, next steps). Everything comes from cached reads the other pages
 * share; GitHub streams in its own boundary and can only remove its card.
 */
export default async function HomePage() {
  const [profile, settings, seo, projects, skills, featured, toolkit, cta] = await Promise.all([
    getProfile(),
    getSiteSettings(),
    resolvePageSeo('home'),
    getProjects(),
    getSkills(),
    getSection('featured'),
    getSection('toolkit'),
    getSection('cta'),
  ]);
  const github = settings.showGithubSection ? settings.githubUsername : null;

  return (
    <PageShell page="home">
      <Hero profile={profile} monogram={settings.monogram} />
      <FeaturedWork
        section={sectionOr(featured, copy.home.featured)}
        projects={projects}
        labels={{ viewAll: copy.home.viewAll, readCaseStudy: copy.home.readCaseStudy }}
      />
      <Toolkit
        section={sectionOr(toolkit, copy.home.toolkit)}
        skills={skills}
        usage={usageCounts(projects)}
        aside={
          github && (
            <Suspense fallback={<GithubPulseSkeleton />}>
              <GithubPulse username={github} />
            </Suspense>
          )
        }
      />
      <ClosingBand section={sectionOr(cta, copy.home.cta)} />
      <JsonLd
        data={buildPageNode({
          type: 'WebPage',
          path: '/',
          name: seo.title,
          description: seo.description,
          primaryImage: true,
        })}
      />
    </PageShell>
  );
}
