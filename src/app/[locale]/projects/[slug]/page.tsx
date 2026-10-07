import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Reveal } from '@/components/ui/Reveal';
import { getProjectBySlug, getProjectSlugs } from '@/features/projects/queries';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import { pageMetadata } from '@/lib/seo/metadata';
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
  return pageMetadata({
    locale,
    path: `/projects/${project.slug}`,
    title: project.name,
    description: project.tagline,
  });
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { locale, project: p } = await resolve(params);
  const t = getDictionary(locale).projects;
  const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

  return (
    <article className="band">
      <div className="wrap">
        <Reveal className="section-head">
          <Link href={localizedPath(locale, '/projects')} className="link-arrow" style={{ marginBottom: 18 }}>
            <Icon name="arrowLeft" /> {t.backToProjects}
          </Link>
          <div className="eyebrow">
            <span className="bar" />
            <span>{p.tagline}</span>
          </div>
          <h1 className="h-section">{p.name}</h1>
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Reveal className="card flex flex-col gap-6 p-6 sm:p-8">
            {p.cover && (
              <div className="relative aspect-video overflow-hidden rounded-card-sm">
                <Image src={p.cover.src} alt={p.cover.alt} fill sizes="(max-width: 1024px) 100vw, 760px" className="object-cover" />
              </div>
            )}
            <p className="text-body">{p.summary}</p>
            {p.gallery.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {p.gallery.map((m) => (
                  <div key={m.src} className="relative aspect-video overflow-hidden rounded-card-sm">
                    <Image src={m.src} alt={m.alt} fill sizes="(max-width: 640px) 100vw, 380px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </Reveal>

          <Reveal delay={100} className="flex flex-col gap-6">
            <div className="card p-6">
              <h2 className="mono mb-3 text-xs tracking-widest text-muted uppercase">{t.builtWith}</h2>
              <ul className="tag-row">
                {p.technologies.map((tech) => (
                  <li className="tag" key={tech.slug}>
                    {tech.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h2 className="mono mb-3 text-xs tracking-widest text-muted uppercase">{t.links}</h2>
              <div className="flex flex-col gap-3">
                {p.links.demo && (
                  <a className="link-arrow" href={p.links.demo} {...external}>
                    <Icon name="external" /> {t.liveDemo}
                  </a>
                )}
                {p.repositories.map((r) => (
                  <a key={r.url} className="link-arrow" href={r.url} {...external}>
                    <Icon name="github" /> {r.owner}/{r.name}
                  </a>
                ))}
                {p.links.details && (
                  <a className="link-arrow" href={p.links.details} {...external}>
                    <Icon name="arrowUpRight" /> {t.details}
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
      <JsonLd
        data={{
          ...buildPageNode({ type: 'WebPage', locale, path: `/projects/${p.slug}`, name: p.name, description: p.tagline }),
          mainEntity: buildProject(p, locale),
        }}
      />
    </article>
  );
}
