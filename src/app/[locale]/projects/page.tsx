import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { GitHubSection } from '@/features/github/components/GitHubSection';
import { getProfile } from '@/features/profile/queries';
import { Projects } from '@/features/projects/components/Projects';
import { getProjects } from '@/features/projects/queries';
import { getSection, getSiteSettings } from '@/features/site/queries';
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveLocale, type LocaleParams } from '@/i18n/route-params';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata({ params }: LocaleParams) {
  return topLevelPageMetadata('projects', await resolveLocale(params), '/projects');
}

export default async function ProjectsPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const [projects, settings, profile, projectsSection, githubSection, content] = await Promise.all([
    getProjects(locale),
    getSiteSettings(),
    getProfile(locale),
    getSection('projects', locale),
    getSection('github', locale),
    resolvePageSeo('projects', locale),
  ]);
  const github = settings.showGithubSection ? settings.githubUsername : null;

  return (
    <PageShell page="projects" locale={locale}>
      <Projects
        section={projectsSection}
        projects={projects}
        githubUrl={github ? `https://github.com/${github}` : null}
        locale={locale}
        t={dict.projects}
      />
      {github && (
        <GitHubSection
          section={githubSection}
          username={github}
          displayName={profile.fullName}
          locale={locale}
          t={dict.github}
        />
      )}
      <JsonLd
        data={buildPageNode({
          type: 'CollectionPage',
          locale,
          path: '/projects',
          name: content.title,
          description: content.description,
          projects,
        })}
      />
    </PageShell>
  );
}
