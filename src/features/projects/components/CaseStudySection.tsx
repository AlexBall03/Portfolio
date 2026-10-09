import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { InlineText, RichText } from '@/components/ui/RichText';
import { Status } from '@/components/ui/Status';
import { copy } from '@/config/copy';
import { cn } from '@/lib/cn';
import { videoEmbed } from '../case-study';
import type { CaseStudySection as Section } from '../types';
import { GalleryLightbox } from './GalleryLightbox';

const t = copy.projects;

const pad = (n: number) => String(n).padStart(2, '0');

export const sectionAnchor = (id: string) => `section-${id}`;

/** Labels the lightbox needs, from the projects copy. */
export const lightboxLabels = () => ({
  view: t.viewImage,
  close: t.closeImage,
  previous: t.previousImage,
  next: t.nextImage,
});

/**
 * One numbered block of the project page: an accent index, the heading, and
 * the content. Overview, every case-study section, and the timeline share it,
 * so the page keeps one rhythm whatever combination a project uses.
 */
export function CaseStudyBlock({
  anchor,
  index,
  heading,
  hidden,
  children,
}: {
  anchor: string;
  index: number;
  heading: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  const headingId = `${anchor}-title`;
  return (
    <section id={anchor} aria-labelledby={headingId} className="flex scroll-mt-28 flex-col gap-7 border-t border-line pt-8">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span aria-hidden="true" className="font-mono text-label text-accent-fg tabular-nums">
          {pad(index)}
        </span>
        <h2 id={headingId} className="text-h3 text-balance">
          {heading}
        </h2>
        {hidden && <Status>{t.hidden}</Status>}
      </header>
      {children}
    </section>
  );
}

/** A case-study section's content, by kind. Parts a section leaves empty simply don't render. */
export function CaseStudyContent({ section: s, title }: { section: Section; title: string }) {
  const intro = s.body.length > 0 && <RichText paragraphs={s.body} lead={s.kind === 'narrative'} />;

  switch (s.kind) {
    case 'narrative':
      return intro;

    case 'architecture':
      return (
        <>
          {intro}
          {s.media.length > 0 && <GalleryLightbox images={s.media} layout="stack" labels={lightboxLabels()} />}
        </>
      );

    case 'gallery':
      return (
        <>
          {intro}
          <GalleryLightbox images={s.media} labels={lightboxLabels()} />
        </>
      );

    case 'highlights':
      return (
        <>
          {intro}
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {s.items.map((item, i) => (
              <li key={i} className="flex flex-col gap-2 border-t border-line-strong pt-4">
                <span aria-hidden="true" className="font-mono text-micro text-accent-fg tabular-nums">
                  {pad(i + 1)}
                </span>
                <h3 className="text-body-lg font-medium text-fg">
                  <InlineText text={item.title} />
                </h3>
                {item.body && (
                  <p className="text-body-sm text-fg-muted">
                    <InlineText text={item.body} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      );

    case 'challenges':
      return (
        <>
          {intro}
          <ol className="flex flex-col divide-y divide-line border-y border-line">
            {s.items.map((item, i) => (
              <li key={i} className="grid gap-4 py-6 md:grid-cols-2 md:gap-10">
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">
                    {t.challenge} {pad(i + 1)}
                  </span>
                  <h3 className="text-body-lg font-medium text-fg">
                    <InlineText text={item.title} />
                  </h3>
                </div>
                {item.body && (
                  <div className="flex flex-col gap-2 md:border-l md:border-line md:pl-10">
                    <span className="inline-flex items-center gap-2 font-mono text-micro tracking-[0.14em] text-brand-fg uppercase [&_svg]:size-3.5">
                      <Icon name="check" /> {t.solution}
                    </span>
                    <p className="text-body text-fg-muted">
                      <InlineText text={item.body} />
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </>
      );

    case 'outcomes':
      return (
        <>
          {intro}
          <ul className={cn('grid gap-px overflow-hidden rounded-lg border border-line bg-line', s.items.length > 1 && 'sm:grid-cols-2')}>
            {s.items.map((item, i) => (
              <li key={i} className="flex flex-col gap-2 bg-canvas p-6">
                <p className="text-h3 text-balance text-fg">
                  <InlineText text={item.title} />
                </p>
                {item.body && (
                  <p className="text-body-sm text-fg-muted">
                    <InlineText text={item.body} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      );

    case 'lessons':
      return (
        <>
          {intro}
          <ol className="flex flex-col gap-6">
            {s.items.map((item, i) => (
              <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4">
                <span aria-hidden="true" className="font-mono text-h3 leading-none text-accent-fg/80 tabular-nums">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-body-lg font-medium text-fg">
                    <InlineText text={item.title} />
                  </h3>
                  {item.body && (
                    <p className="text-body-sm text-fg-muted">
                      <InlineText text={item.body} />
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      );

    case 'video': {
      if (!s.videoUrl) return intro;
      const video = videoEmbed(s.videoUrl);
      return (
        <>
          {video.kind === 'embed' ? (
            <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-surface-inset">
              <iframe
                src={video.src}
                title={t.videoTitle.replace('{title}', `${title} · ${s.heading}`)}
                loading="lazy"
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 size-full"
              />
            </div>
          ) : (
            <a
              href={video.href}
              target="_blank"
              rel="noopener noreferrer"
              className="glass inline-flex items-center gap-3 self-start rounded-lg px-5 py-4 text-body text-fg transition-colors hover:text-brand-fg [&_svg]:size-4"
            >
              {t.watchVideo} <Icon name="arrowUpRight" />
            </a>
          )}
          {intro}
        </>
      );
    }
  }
}
