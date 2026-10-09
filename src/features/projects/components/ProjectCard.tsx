import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Status } from '@/components/ui/Status';
import { TagList } from '@/components/ui/Tag';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import { cn } from '@/lib/cn';
import type { Project } from '../types';
import { ProjectMedia } from './ProjectMedia';

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** The title link stretched over the whole card, so the card is one target with one focus ring. */
const STRETCHED_LINK =
  "after:absolute after:inset-0 after:z-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus";

interface ProjectCardProps {
  project: Project;
  index: number;
  locale: Locale;
  t: Dictionary['projects'];
  /**
   * `feature`: full-width glass split; `compact`: media over content in a grid
   * cell; `tile`: a lighter preview (home), the whole card linking to the case study.
   */
  layout?: 'feature' | 'compact' | 'tile';
  /** Feature layout only: put the media on the right. */
  reverse?: boolean;
  /** The card title's level: h2 in the projects list, h3 under another section's heading. */
  headingLevel?: 'h2' | 'h3';
  /** Tile only: the call to action under the content ("Read the case study"). */
  cta?: string;
  /** Show the Featured badge (the projects index; implied elsewhere). */
  showFeatured?: boolean;
}

export function ProjectCard({
  project: p,
  index,
  locale,
  t,
  layout = 'feature',
  reverse = false,
  headingLevel: Heading = 'h2',
  cta,
  showFeatured = false,
}: ProjectCardProps) {
  const href = localizedPath(locale, `/projects/${p.slug}`);
  const number = String(index + 1).padStart(2, '0');
  const feature = layout === 'feature';
  const tile = layout === 'tile';

  return (
    <Reveal delay={Math.min(index, 3) * 80} className="h-full">
      <article
        className={cn(
          'group relative grid h-full overflow-hidden rounded-xl transition-[border-color,box-shadow,translate] duration-200 ease-standard',
          feature
            ? 'glass lg:grid-cols-2'
            : 'grid-rows-[auto_1fr] border border-line bg-surface-raised/60 hover:border-line-strong hover:shadow-md motion-safe:hover:-translate-y-0.5',
        )}
      >
        <ProjectMedia
          project={p}
          sizes={feature ? '(max-width: 1024px) 100vw, 600px' : tile ? '(max-width: 768px) 100vw, 400px' : '(max-width: 768px) 100vw, 560px'}
          className={cn(
            'aspect-[16/10] border-b border-line',
            feature && 'lg:aspect-auto lg:min-h-[26rem] lg:border-b-0',
            feature && (reverse ? 'lg:order-last lg:border-l' : 'lg:border-r'),
          )}
        />

        <div className={cn('flex min-w-0 flex-col', feature ? 'gap-5 p-6 sm:p-10' : tile ? 'gap-4 p-5 sm:p-6' : 'gap-5 p-6')}>
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-label text-accent-fg">{number}</span>
            <span className="flex flex-wrap justify-end gap-2">
              {showFeatured && p.featured && <Status tone="brand">{t.featured}</Status>}
              {p.isLive && <Status tone="success">{t.live}</Status>}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Heading className={feature ? 'text-h2' : 'text-h3'}>
              <Link href={href} className={STRETCHED_LINK}>
                {p.name}
              </Link>
            </Heading>
            <p className={tile ? 'text-body-sm text-fg-muted' : 'text-body-lg text-fg'}>{p.tagline}</p>
          </div>

          {!tile && <p className="line-clamp-4 text-body-sm text-fg-muted">{p.summary}</p>}

          <TagList items={p.technologies.map((s) => s.name)} label={t.builtWith} />

          {tile ? (
            cta && (
              <span
                aria-hidden="true"
                className="mt-auto inline-flex items-center gap-1.5 pt-1 text-body-sm font-medium text-brand-fg [&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-200 group-hover:[&_svg]:translate-x-0.5"
              >
                {cta} <Icon name="arrowRight" />
              </span>
            )
          ) : (
            <div className="relative z-10 mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
              <Link href={href} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {t.details} <Icon name="arrowRight" />
              </Link>
              {p.links.demo && (
                <a className={buttonStyles({ variant: 'quiet' })} href={p.links.demo} {...external}>
                  {t.liveDemo} <Icon name="arrowUpRight" />
                </a>
              )}
              {p.links.source && (
                <a className={buttonStyles({ variant: 'quiet' })} href={p.links.source} {...external}>
                  <Icon name="github" /> {t.source}
                </a>
              )}
            </div>
          )}
        </div>
      </article>
    </Reveal>
  );
}
