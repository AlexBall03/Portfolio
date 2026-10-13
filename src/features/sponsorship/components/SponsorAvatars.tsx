import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { copy, fill } from '@/config/copy';
import { cn } from '@/lib/cn';
import { sponsorName } from '../sponsors';
import type { Sponsor } from '../types';

const t = copy.sponsorship;

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * A sponsor's avatar over their initial, so a picture that fails to load
 * leaves the initial rather than a gap. Decorative: the link names the sponsor.
 */
function Avatar({ sponsor, size, className }: { sponsor: Sponsor; size: number; className?: string }) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden border border-line bg-surface-inset font-mono text-label text-fg-muted uppercase transition-colors',
        // GitHub draws organizations as rounded squares and people as circles.
        sponsor.kind === 'organization' ? 'rounded-md' : 'rounded-full',
        className,
      )}
    >
      <span aria-hidden="true">{sponsorName(sponsor).charAt(0)}</span>
      <Image src={sponsor.avatarUrl} alt="" width={size} height={size} className="absolute inset-0 size-full object-cover" />
    </span>
  );
}

interface SponsorAvatarsProps {
  sponsors: readonly Sponsor[];
  /**
   * `compact`: a row of avatars (the home preview). `full`: a grid of avatars
   * with names (the support page). Every entry links to the GitHub profile.
   */
  layout?: 'compact' | 'full';
  className?: string;
}

/** Public sponsors, from GitHub. Renders nothing for an empty list. */
export function SponsorAvatars({ sponsors, layout = 'compact', className }: SponsorAvatarsProps) {
  if (!sponsors.length) return null;

  if (layout === 'compact') {
    return (
      <ul className={cn('flex flex-wrap gap-2.5', className)}>
        {sponsors.map((s) => (
          <li key={s.id}>
            <a
              href={s.url}
              {...external}
              title={sponsorName(s)}
              aria-label={fill(t.profileLabel, { name: sponsorName(s) })}
              className="group block rounded-full transition-[translate] duration-200 ease-standard hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Avatar sponsor={s} size={44} className="size-11 group-hover:border-brand" />
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {sponsors.map((s) => (
        <li key={s.id}>
          <a
            href={s.url}
            {...external}
            aria-label={fill(t.profileLabel, { name: sponsorName(s) })}
            className="group flex h-full items-center gap-3.5 rounded-lg border border-line p-3.5 transition-colors hover:border-brand/45 hover:bg-surface-raised/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Avatar sponsor={s} size={48} className="size-12" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium break-words text-fg transition-colors group-hover:text-brand-fg">{sponsorName(s)}</span>
              <span className="font-mono text-micro break-all text-fg-faint">
                @{s.login}
                {s.kind === 'organization' && ` · ${t.organization}`}
              </span>
            </span>
            <Icon
              name="arrowUpRight"
              className="ml-auto size-4 shrink-0 text-fg-faint transition-[translate,color] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
