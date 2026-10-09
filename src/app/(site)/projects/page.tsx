import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { GitHubSection } from '@/features/github/components/GitHubSection';
import { getProfile } from '@/features/profile/queries';
import { Projects } from '@/features/projects/components/Projects';
import { getProjects } from '@/features/projects/queries';
import { getSection, getSiteSettings } from '@/features/site/queries';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata() {
  return topLevelPageMetadata('projects', '/projects');
}

export default async function ProjectsPage() {
  const [projects, settings, profile, projectsSection, githubSection, content] = await Promise.all([
    getProjects(),
    getSiteSettings(),
    getProfile(),
    getSection('projects'),
    getSection('github'),
    resolvePageSeo('projects'),
  ]);
  const github = settings.showGithubSection ? settings.githubUsername : null;

  return (
    <PageShell page="projects">
      <Projects
        section={projectsSection}
        projects={projects}
        githubUrl={github ? `https://github.com/${github}` : null}
      />
      {github && (
        <GitHubSection
          section={githubSection}
          username={github}
          displayName={profile.fullName}
        />
      )}
      <JsonLd
        data={buildPageNode({
          type: 'CollectionPage',
          path: '/projects',
          name: content.title,
          description: content.description,
          projects,
        })}
      />
    </PageShell>
  );
}
