import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { Prose } from '@/components/ui/Prose';
import { Reveal } from '@/components/ui/Reveal';
import { Status } from '@/components/ui/Status';
import { Surface } from '@/components/ui/Surface';
import { TagList } from '@/components/ui/Tag';
import type { Project, ProjectCaseStudy } from '../types';
import { CaseStudyBlock, CaseStudyContent, lightboxLabels, sectionAnchor } from './CaseStudySection';
import { GalleryLightbox } from './GalleryLightbox';
import { MilestoneTimeline } from './MilestoneTimeline';
import { ProjectCard } from './ProjectCard';
import { ProjectMedia } from './ProjectMedia';
import { copy } from '@/config/copy';

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <dt className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Glass metadata panel: renders only the rows the project has data for. */
const t = copy.projects;

function ProjectMeta({ project: p, showRepositories }: { project: Project; showRepositories: boolean }) {
  const linkClass =
    'inline-flex items-center gap-2 text-body-sm text-fg-muted transition-colors hover:text-fg [&_svg]:size-4 [&_svg]:text-brand-fg';
  return (
    <Surface variant="glass" radius="xl" as="aside" className="p-6 sm:p-7">
      <dl className="divide-y divide-line">
        {p.isLive && (
          <MetaRow label={t.status}>
            <Status tone="success">{t.live}</Status>
          </MetaRow>
        )}
        {p.technologies.length > 0 && (
          <MetaRow label={t.builtWith}>
            <TagList items={p.technologies.map((s) => s.name)} />
          </MetaRow>
        )}
        {showRepositories && p.repositories.length > 0 && (
          <MetaRow label={t.repositories}>
            <ul className="flex flex-col gap-2">
              {p.repositories.map((r) => (
                <li key={r.url}>
                  <a className={`${linkClass} font-mono`} href={r.url} {...external}>
                    <Icon name="github" /> {r.owner}/{r.name}
                  </a>
                </li>
              ))}
            </ul>
          </MetaRow>
        )}
        {(p.links.demo || p.links.details) && (
          <MetaRow label={t.links}>
            <ul className="flex flex-col gap-2">
              {p.links.demo && (
                <li>
                  <a className={linkClass} href={p.links.demo} {...external}>
                    <Icon name="external" /> {t.liveDemo}
                  </a>
                </li>
              )}
              {p.links.details && (
                <li>
                  <a className={linkClass} href={p.links.details} {...external}>
                    <Icon name="file" /> {t.writeup}
                  </a>
                </li>
              )}
            </ul>
          </MetaRow>
        )}
      </dl>
    </Surface>
  );
}

interface TocEntry {
  anchor: string;
  label: string;
}

/** "On this page": anchors to the numbered blocks, shown once there are enough to need it. */
function OnThisPage({ entries }: { entries: TocEntry[] }) {
  return (
    <nav aria-labelledby="project-toc" className="hidden flex-col gap-3 px-1 lg:flex">
      <h2 id="project-toc" className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">
        {t.onThisPage}
      </h2>
      <ol className="flex flex-col border-l border-line">
        {entries.map((e, i) => (
          <li key={e.anchor}>
            <a
              href={`#${e.anchor}`}
              className="-ml-px flex gap-3 border-l border-transparent py-1.5 pl-4 text-body-sm text-fg-muted transition-colors hover:border-brand hover:text-fg"
            >
              <span aria-hidden="true" className="font-mono text-micro text-fg-faint tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">{e.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface ProjectDetailProps {
  project: ProjectCaseStudy;
  /** The related projects to show: already resolved against published projects, in order. */
  related: Project[];
  /**
   * The project's GitHub analytics, composed by the page (a separate source
   * from the curated milestones). It lists the verified public repositories
   * itself, so the metadata panel then leaves its repository links out.
   */
  github?: { heading: string; lead: string; content: ReactNode; hidden?: boolean } | null;
}

/**
 * A project's page: hero, then the case study (overview, the project's
 * sections, timeline) beside a sticky metadata panel, then related projects.
 * Every block is optional except the overview, so a project with no case
 * study renders as it did before Phase 5A.
 */
export function ProjectDetail({ project: p, related, github }: ProjectDetailProps) {
  const legacyGallery = p.gallery.length > 0 && !p.sections.some((s) => s.kind === 'gallery');
  const blocks: TocEntry[] = [
    { anchor: 'project-overview', label: t.overview },
    ...p.sections.map((s) => ({ anchor: sectionAnchor(s.id), label: s.heading })),
    ...(legacyGallery ? [{ anchor: 'project-gallery', label: t.gallery }] : []),
    ...(p.milestones.length ? [{ anchor: 'project-timeline', label: t.timeline }] : []),
    ...(github ? [{ anchor: 'project-github', label: github.heading }] : []),
  ];
  const toc = [...blocks, ...(related.length ? [{ anchor: 'project-related', label: t.related }] : [])];
  const indexOf = (anchor: string) => blocks.findIndex((b) => b.anchor === anchor) + 1;

  return (
    <article aria-labelledby="project-title" className="pt-page-top">
      <Container>
        <Reveal className="flex flex-col gap-6">
          <Link href={'/projects'} className={buttonStyles({ variant: 'quiet', className: 'self-start' })}>
            <Icon name="arrowLeft" /> {t.backToProjects}
          </Link>
          <Eyebrow>{t.project}</Eyebrow>
          <h1 id="project-title" className="text-display-lg">
            {p.name}
          </h1>
          <p className="max-w-[48ch] text-body-lg text-fg-muted">{p.tagline}</p>
          {(p.links.demo || p.links.source) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {p.links.demo && (
                <a className={buttonStyles()} href={p.links.demo} {...external}>
                  {t.liveDemo} <Icon name="arrowUpRight" />
                </a>
              )}
              {p.links.source && (
                <a className={buttonStyles({ variant: 'secondary' })} href={p.links.source} {...external}>
                  <Icon name="github" /> {t.source}
                </a>
              )}
            </div>
          )}
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-14">
          <div className="flex min-w-0 flex-col gap-12">
            <Reveal>
              <ProjectMedia
                project={p}
                size="detail"
                sizes="(max-width: 1024px) 100vw, 780px"
                priority
                className="aspect-[16/9] rounded-xl border border-line"
              />
            </Reveal>

            <Reveal>
              <CaseStudyBlock anchor="project-overview" index={1} heading={t.overview}>
                <Prose paragraphs={[p.summary, ...p.body]} lead />
              </CaseStudyBlock>
            </Reveal>

            {p.sections.map((s) => (
              <Reveal key={s.id}>
                <CaseStudyBlock anchor={sectionAnchor(s.id)} index={indexOf(sectionAnchor(s.id))} heading={s.heading} hidden={s.hidden}>
                  <CaseStudyContent section={s} title={p.name} />
                </CaseStudyBlock>
              </Reveal>
            ))}

            {legacyGallery && (
              <Reveal>
                <CaseStudyBlock anchor="project-gallery" index={indexOf('project-gallery')} heading={t.gallery}>
                  <GalleryLightbox images={p.gallery} labels={lightboxLabels()} />
                </CaseStudyBlock>
              </Reveal>
            )}

            {p.milestones.length > 0 && (
              <Reveal>
                <CaseStudyBlock anchor="project-timeline" index={indexOf('project-timeline')} heading={t.timeline}>
                  <p className="-mt-3 max-w-[60ch] text-body text-fg-muted">{t.timelineLead}</p>
                  <MilestoneTimeline milestones={p.milestones} />
                </CaseStudyBlock>
              </Reveal>
            )}

            {github && (
              <Reveal>
                <CaseStudyBlock anchor="project-github" index={indexOf('project-github')} heading={github.heading} hidden={github.hidden}>
                  <p className="-mt-3 max-w-[60ch] text-body text-fg-muted">{github.lead}</p>
                  {github.content}
                </CaseStudyBlock>
              </Reveal>
            )}
          </div>

          <Reveal delay={100} className="lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-col gap-8">
              <ProjectMeta project={p} showRepositories={!github} />
              {toc.length > 2 && <OnThisPage entries={toc} />}
            </div>
          </Reveal>
        </div>

        {related.length > 0 && (
          <section id="project-related" aria-labelledby="project-related-title" className="mt-24 scroll-mt-28 border-t border-line pt-10">
            <h2 id="project-related-title" className="mb-8 text-h2">
              {t.related}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <ProjectCard key={r.id} project={r} index={i} layout="compact" headingLevel="h3" />
              ))}
            </div>
          </section>
        )}
      </Container>
    </article>
  );
}
