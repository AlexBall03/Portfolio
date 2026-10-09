import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
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
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveLocale, type LocaleParams } from '@/i18n/route-params';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata({ params }: LocaleParams) {
  return topLevelPageMetadata('home', await resolveLocale(params), '/');
}

/**
 * Home: the hero, then three short sections (featured work, the toolkit with a
 * GitHub pulse, next steps). Everything comes from cached reads the other pages
 * share; GitHub streams in its own boundary and can only remove its card.
 */
export default async function HomePage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const [profile, settings, seo, projects, skills, featured, toolkit, cta] = await Promise.all([
    getProfile(locale),
    getSiteSettings(),
    resolvePageSeo('home', locale),
    getProjects(locale),
    getSkills(locale),
    getSection('featured', locale),
    getSection('toolkit', locale),
    getSection('cta', locale),
  ]);
  const github = settings.showGithubSection ? settings.githubUsername : null;

  return (
    <PageShell page="home" locale={locale}>
      <Hero profile={profile} monogram={settings.monogram} locale={locale} t={dict.hero} />
      <FeaturedWork
        section={sectionOr(featured, dict.home.featured)}
        projects={projects}
        locale={locale}
        t={dict.projects}
        labels={{ viewAll: dict.home.viewAll, readCaseStudy: dict.home.readCaseStudy }}
      />
      <Toolkit
        section={sectionOr(toolkit, dict.home.toolkit)}
        skills={skills}
        usage={usageCounts(projects)}
        locale={locale}
        t={dict.skills}
        aside={
          github && (
            <Suspense fallback={<GithubPulseSkeleton />}>
              <GithubPulse
                username={github}
                locale={locale}
                t={{
                  title: dict.home.pulseTitle,
                  repos: dict.home.pulseRepos,
                  lastActivity: dict.home.pulseLastActivity,
                  link: dict.home.pulseLink,
                  contributions: dict.github.contributionsCaption,
                  contributionsOne: dict.github.contributionsCaptionOne,
                }}
              />
            </Suspense>
          )
        }
      />
      <ClosingBand section={sectionOr(cta, dict.home.cta)} locale={locale} nav={dict.nav} />
      <JsonLd
        data={buildPageNode({
          type: 'WebPage',
          locale,
          path: '/',
          name: seo.title,
          description: seo.description,
          primaryImage: true,
        })}
      />
    </PageShell>
  );
}
