import Image from 'next/image';
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
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import type { Project } from '../types';
import { ProjectMedia } from './ProjectMedia';

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * A titled block in the project body. Overview and Gallery use it today;
 * richer case-study content (architecture, decisions, outcomes) slots in as
 * more DetailSections without changing the page's structure.
 */
function DetailSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 border-t border-line pt-8">
      <h2 id={id} className="font-mono text-label tracking-[0.16em] text-fg-faint uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <dt className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Glass metadata panel: renders only the rows the project has data for. */
function ProjectMeta({ project: p, t }: { project: Project; t: Dictionary['projects'] }) {
  const linkClass =
    'inline-flex items-center gap-2 text-body-sm text-fg-muted transition-colors hover:text-fg [&_svg]:size-4 [&_svg]:text-brand-fg';
  return (
    <Surface variant="glass" radius="xl" as="aside" className="p-6 sm:p-7 lg:sticky lg:top-28">
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
        {p.repositories.length > 0 && (
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

interface ProjectDetailProps {
  project: Project;
  locale: Locale;
  t: Dictionary['projects'];
}

export function ProjectDetail({ project: p, locale, t }: ProjectDetailProps) {
  return (
    <article aria-labelledby="project-title" className="pt-12 sm:pt-16">
      <Container>
        <Reveal className="flex flex-col gap-6">
          <Link href={localizedPath(locale, '/projects')} className={buttonStyles({ variant: 'quiet', className: 'self-start' })}>
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
              <DetailSection id="project-overview" title={t.overview}>
                <Prose paragraphs={[p.summary]} lead />
              </DetailSection>
            </Reveal>

            {p.gallery.length > 0 && (
              <Reveal>
                <DetailSection id="project-gallery" title={t.gallery}>
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {p.gallery.map((m) => (
                      <li key={m.src} className="relative aspect-video overflow-hidden rounded-lg border border-line bg-surface-inset">
                        <Image src={m.src} alt={m.alt} fill sizes="(max-width: 640px) 100vw, 380px" className="object-cover" />
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              </Reveal>
            )}
          </div>

          <Reveal delay={100}>
            <ProjectMeta project={p} t={t} />
          </Reveal>
        </div>
      </Container>
    </article>
  );
}
