import { ICONS, isIconName, type IconName } from './icons';

export { ICON_NAMES, isIconName, type IconName } from './icons';

/** Filled glyphs (logos); everything else is drawn with strokes. */
const FILLED = new Set<IconName>(['github']);

interface IconProps {
  /** Accepts any string so database-provided names render safely (unknown → nothing). */
  name: IconName | (string & {});
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  if (!isIconName(name)) return null;
  const filled = FILLED.has(name);
  return (
    <svg
      className={className}
      data-icon={name}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]
        .split('M')
        .filter(Boolean)
        .map((seg, i) => (
          <path key={i} d={`M${seg}`} fillRule="evenodd" />
        ))}
    </svg>
  );
}
