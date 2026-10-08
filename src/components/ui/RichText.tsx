import { Fragment } from 'react';
import { cn } from '@/lib/cn';
import { type Inline, parseBlocks, parseInline } from '@/lib/inline-markup';

/** Inline markup as React nodes: text stays text, links are checked by the parser. */
export function InlineText({ text }: { text: string }) {
  return <Nodes nodes={parseInline(text)} />;
}

function Nodes({ nodes }: { nodes: readonly Inline[] }) {
  return nodes.map((n, i) => {
    switch (n.type) {
      case 'text':
        return <Fragment key={i}>{n.text}</Fragment>;
      case 'code':
        return (
          <code key={i} className="rounded-sm bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-fg">
            {n.text}
          </code>
        );
      case 'strong':
        return (
          <strong key={i} className="font-semibold text-fg">
            <Nodes nodes={n.children} />
          </strong>
        );
      case 'em':
        return (
          <em key={i}>
            <Nodes nodes={n.children} />
          </em>
        );
      case 'link':
        return (
          <a
            key={i}
            href={n.href}
            {...(n.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-brand-fg underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
          >
            <Nodes nodes={n.children} />
          </a>
        );
    }
  });
}

/**
 * Long-form paragraphs with light inline markup (`lib/inline-markup.ts`) at a
 * comfortable measure, like `Prose`. The first paragraph can lead.
 */
export function RichText({ paragraphs, lead = false, className }: { paragraphs: string[]; lead?: boolean; className?: string }) {
  return (
    <div className={cn('flex max-w-[65ch] flex-col gap-5 text-body text-fg-muted', className)}>
      {paragraphs.flatMap((p, i) =>
        parseBlocks(p).map((block, j) =>
          block.type === 'list' ? (
            <ul key={`${i}-${j}`} className="flex flex-col gap-2 pl-5 marker:text-accent-fg [list-style:square]">
              {block.items.map((item, k) => (
                <li key={k} className="pl-1">
                  <Nodes nodes={item} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={`${i}-${j}`} className={cn(lead && i === 0 && j === 0 && 'text-body-lg text-fg')}>
              {block.lines.map((line, k) => (
                <Fragment key={k}>
                  {k > 0 && <br />}
                  <Nodes nodes={line} />
                </Fragment>
              ))}
            </p>
          ),
        ),
      )}
    </div>
  );
}
