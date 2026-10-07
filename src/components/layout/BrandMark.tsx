/**
 * Renders a wordmark like `</Alex-Ball\>` with the bracket and dash glyphs
 * styled as accents. Any brand string works; only these tokens are styled.
 */
export function BrandMark({ text }: { text: string }) {
  const parts = text.split(/(<\/|\\>|-)/).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part === '</' || part === '\\>') return <span key={i} className="bk">{part}</span>;
        if (part === '-') return <span key={i} className="dash">-</span>;
        return part;
      })}
    </>
  );
}
