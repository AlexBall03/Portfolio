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

interface ProjectCardProps {
  project: Project;
  index: number;
  locale: Locale;
  t: Dictionary['projects'];
  /** `feature`: full-width glass split; `compact`: media over content in a grid cell. */
  layout?: 'feature' | 'compact';
  /** Feature layout only: put the media on the right. */
  reverse?: boolean;
}

export function ProjectCard({ project: p, index, locale, t, layout = 'feature', reverse = false }: ProjectCardProps) {
  const href = localizedPath(locale, `/projects/${p.slug}`);
  const number = String(index + 1).padStart(2, '0');
  const feature = layout === 'feature';

  return (
    <Reveal delay={Math.min(index, 3) * 80}>
      <article
        className={cn(
          'group relative grid h-full overflow-hidden rounded-xl transition-colors duration-200 hover:border-line-strong',
          feature ? 'glass lg:grid-cols-2' : 'border border-line bg-surface-raised/60',
        )}
      >
        <ProjectMedia
          project={p}
          index={number}
          sizes={feature ? '(max-width: 1024px) 100vw, 600px' : '(max-width: 768px) 100vw, 560px'}
          className={cn(
            'aspect-[16/10] border-b border-line',
            feature && 'lg:aspect-auto lg:min-h-[26rem] lg:border-b-0',
            feature && (reverse ? 'lg:order-last lg:border-l' : 'lg:border-r'),
          )}
        />

        <div className={cn('flex min-w-0 flex-col gap-5', feature ? 'p-6 sm:p-10' : 'p-6')}>
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-label text-accent-fg">{number}</span>
            {p.isLive && <Status tone="success">{t.live}</Status>}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className={feature ? 'text-h2' : 'text-h3'}>
              <Link
                href={href}
                className="after:absolute after:inset-0 after:z-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
              >
                {p.name}
              </Link>
            </h2>
            <p className="text-body-lg text-fg">{p.tagline}</p>
          </div>

          <p className="line-clamp-4 text-body-sm text-fg-muted">{p.summary}</p>

          <TagList items={p.technologies.map((s) => s.name)} label={t.builtWith} />

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
        </div>
      </article>
    </Reveal>
  );
}
