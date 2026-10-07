import { cn } from '@/lib/cn';

/**
 * Renders a wordmark like `</Alex-Ball\>` with the bracket and dash glyphs
 * styled as accents. Any brand string works; only these tokens are styled.
 */
export function BrandMark({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(<\/|\\>|-)/).filter(Boolean);
  return (
    <span className={cn('font-mono font-medium tracking-[-0.02em] whitespace-nowrap text-fg', className)}>
      {parts.map((part, i) => {
        if (part === '</' || part === '\\>')
          return (
            <span key={i} data-part={part === '</' ? 'open' : 'close'} className="text-brand-fg">
              {part}
            </span>
          );
        if (part === '-')
          return (
            <span key={i} className="text-accent-fg">
              -
            </span>
          );
        return part;
      })}
    </span>
  );
}
