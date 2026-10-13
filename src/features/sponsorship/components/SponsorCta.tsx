import { buttonStyles, type ButtonSize } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';

interface SponsorCtaProps {
  /** The GitHub Sponsors address (validated on save to be one). */
  href: string;
  label: string;
  size?: ButtonSize;
  className?: string;
}

/** The sponsorship call to action: the site's primary button, opening GitHub Sponsors in a new tab. */
export function SponsorCta({ href, label, size, className }: SponsorCtaProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonStyles({ size, className })}>
      <Icon name="github" /> {label} <Icon name="arrowUpRight" />
    </a>
  );
}
