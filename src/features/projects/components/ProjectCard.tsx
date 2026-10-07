import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import type { Project } from '../types';

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

interface ProjectCardProps {
  project: Project;
  index: number;
  locale: Locale;
  t: Dictionary['projects'];
}

export function ProjectCard({ project: p, index, locale, t }: ProjectCardProps) {
  const href = localizedPath(locale, `/projects/${p.slug}`);
  return (
    <Reveal delay={index * 90}>
      <article className="card card-hover proj-card">
        <div className="proj-media ph">
          {p.cover && (
            <Image src={p.cover.src} alt={p.cover.alt} fill sizes="(max-width: 880px) 100vw, 560px" className="object-cover" />
          )}
          <span className="num">{String(index + 1).padStart(2, '0')}</span>
          {p.isLive && (
            <span className="badge-live">
              <span className="dt" /> {t.live}
            </span>
          )}
          {!p.cover && <span className="ph-tag">{t.projectShot}</span>}
        </div>
        <div className="proj-body">
          <div>
            <h3>
              <Link href={href} className="hover:text-accent-300">
                {p.name}
              </Link>
            </h3>
            <div className="mono" style={{ color: 'var(--accent-300)', fontSize: '0.8rem', marginTop: 4, letterSpacing: '0.03em' }}>
              {p.tagline}
            </div>
          </div>
          <p className="desc">{p.summary}</p>
          <ul className="tag-row" aria-label={t.builtWith}>
            {p.technologies.map((s) => (
              <li className="tag" key={s.slug}>
                {s.name}
              </li>
            ))}
          </ul>
          <div className="proj-foot">
            {p.links.demo && (
              <a className="lk primary" href={p.links.demo} {...external}>
                <Icon name="external" /> {t.liveDemo}
              </a>
            )}
            {p.links.source && (
              <a className="lk" href={p.links.source} {...external}>
                <Icon name="github" /> {t.source}
              </a>
            )}
            <Link className="lk" href={href}>
              <Icon name="arrowUpRight" /> {t.details}
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
