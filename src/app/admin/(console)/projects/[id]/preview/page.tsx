import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '@/components/ui/button-styles';
import { adminProjectPath } from '@/config/admin';
import { ProjectStatusPill } from '@/features/projects/components/admin/ProjectStatus';
import { ProjectDetail } from '@/features/projects/components/ProjectDetail';
import { pickRelated } from '@/features/projects/case-study';
import { loadProject, loadProjectPreview, loadPublishedProjects } from '@/features/projects/service';
import { uuidParam } from '@/features/projects/upload';
import { DEFAULT_LOCALE, isLocale, LOCALE_TAGS, LOCALES } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { cn } from '@/lib/cn';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Project preview' };

interface PreviewProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}

/**
 * The project exactly as its public page renders it (same component, same
 * read model), whatever its status. Only the admin can reach it.
 */
export default async function ProjectPreviewPage({ params, searchParams }: PreviewProps) {
  await requireAdmin();
  const { id } = await params;
  const requested = (await searchParams).locale;
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  const valid = uuidParam.safeParse(id).success;
  const [values, project, published] = valid
    ? await Promise.all([loadProject(id), loadProjectPreview(id, locale), loadPublishedProjects(locale)])
    : [null, null, []];
  if (!values || !project) notFound();
  const hiddenCount = [...project.sections, ...project.milestones].filter((x) => x.hidden).length;

  return (
    <>
      <div className="glass-strong flex flex-col gap-3 rounded-lg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-body-sm text-fg-muted">
          <ProjectStatusPill status={values.status} />
          {values.status === 'published' ? 'Preview of the live project page.' : 'Preview · not on the public site.'}
          {hiddenCount > 0 && ` ${hiddenCount} hidden ${hiddenCount === 1 ? 'item is' : 'items are'} shown, marked Hidden.`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Preview language" className="flex gap-1">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={`${adminProjectPath(id, 'preview')}?locale=${l}`}
                aria-current={l === locale ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center rounded-full border px-3 text-body-sm transition-colors',
                  l === locale ? 'border-brand/40 bg-brand-soft text-brand-fg' : 'border-line text-fg-muted hover:text-fg',
                )}
              >
                {LOCALE_TAGS[l].label}
              </Link>
            ))}
          </nav>
          <Link href={adminProjectPath(id)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            <Icon name="arrowLeft" /> Back to editor
          </Link>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line pb-14">
        <ProjectDetail
          project={project}
          related={pickRelated(project.id, project.relatedIds, published)}
          locale={locale}
          t={getDictionary(locale).projects}
        />
      </div>
    </>
  );
}
