import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Screen } from '@/components/layout/Screen';
import { PagerLink, PagerNav } from '@/components/layout/Pager';
import { JsonLd } from '@/components/ui/JsonLd';
import { ProjectGithubSection } from '@/features/github/components/ProjectGithubSection';
import { getProfile } from '@/features/profile/queries';
import { pickRelated } from '@/features/projects/case-study';
import { ProjectDetail } from '@/features/projects/components/ProjectDetail';
import { getProjectBySlug, getProjects, getProjectSlugs } from '@/features/projects/queries';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import { pageMetadata } from '@/lib/seo/metadata';
import { shareCardVersion } from '@/lib/seo/share-card/inputs';
import { buildPageNode, buildProject } from '@/lib/seo/structured-data';

/**
 * Allowed to block on navigation: retired slugs must answer with a real 308
 * and unknown slugs with a real 404, which streaming would turn into
 * client-side behavior. Published slugs are prerendered, so this costs nothing
 * in practice.
 */
export const instant = false;

interface ProjectPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

async function resolve(params: ProjectPageProps['params']) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const lookup = await getProjectBySlug(slug, locale);
  if (lookup.kind === 'redirect') permanentRedirect(localizedPath(locale, `/projects/${lookup.slug}`));
  if (lookup.kind === 'not-found') notFound();
  return { locale, project: lookup.project };
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { locale, project } = await resolve(params);
  const [profile, shareVersion] = await Promise.all([
    getProfile(locale),
    shareCardVersion(locale, { kind: 'project', slug: project.slug }),
  ]);
  return pageMetadata({
    locale,
    path: `/projects/${project.slug}`,
    title: project.name,
    description: project.tagline,
    siteName: profile.fullName,
    shareVersion,
  });
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { locale, project: p } = await resolve(params);
  const dict = getDictionary(locale);
  const t = dict.projects;
  const all = await getProjects(locale);
  const index = Math.max(0, all.findIndex((x) => x.id === p.id));
  const prev = all[index - 1];
  const next = all[index + 1];
  const pad = (n: number) => String(n + 1).padStart(2, '0');
  const href = (slug: string) => localizedPath(locale, `/projects/${slug}`);

  return (
    <Screen>
      <div className="flex-1">
        <ProjectDetail
          project={p}
          related={pickRelated(p.id, p.relatedIds, all)}
          locale={locale}
          t={t}
          github={
            p.githubAnalytics && p.repositories.length > 0
              ? {
                  heading: dict.projectGithub.heading,
                  lead: dict.projectGithub.lead,
                  content: <ProjectGithubSection repositories={p.repositories} locale={locale} t={dict.projectGithub} />,
                }
              : null
          }
        />
      </div>
      {(prev || next) && (
        <PagerNav label={`${t.previousProject} / ${t.nextProject}`}>
          {prev && (
            <PagerLink dir="prev" href={href(prev.slug)} kicker={`${t.previousProject} · ${pad(index - 1)}`} title={prev.name} description={prev.tagline} />
          )}
          {next && (
            <PagerLink dir="next" href={href(next.slug)} kicker={`${t.nextProject} · ${pad(index + 1)}`} title={next.name} description={next.tagline} />
          )}
        </PagerNav>
      )}
      <JsonLd
        data={{
          ...buildPageNode({ type: 'WebPage', locale, path: `/projects/${p.slug}`, name: p.name, description: p.tagline }),
          mainEntity: buildProject(p, locale),
        }}
      />
    </Screen>
  );
}
