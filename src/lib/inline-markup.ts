/**
 * A deliberately small markup for case-study prose, parsed into data and
 * rendered as React nodes (`components/ui/RichText`). There is no HTML path
 * at all, so stored text can never inject markup or script.
 *
 * Inline:  **bold**  *emphasis*  `code`  [label](https://…)  (http(s) or a
 *          site path only; anything else stays plain text)
 * Blocks:  consecutive lines starting with "- " form a bulleted list; other
 *          lines form a paragraph, single line breaks kept.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; external: boolean; children: Inline[] };

export type Block = { type: 'paragraph'; lines: Inline[][] } | { type: 'list'; items: Inline[][] };

const TOKEN = /`([^`]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*/;

/** An href that can't run script or leave the expected schemes: http(s) URLs and site paths. */
export function safeHref(raw: string): { href: string; external: boolean } | null {
  if (/^\/(?!\/)/.test(raw)) return { href: raw, external: false };
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? { href: url.toString(), external: true } : null;
  } catch {
    return null;
  }
}

function pushText(out: Inline[], text: string) {
  if (!text) return;
  const last = out.at(-1);
  if (last?.type === 'text') last.text += text;
  else out.push({ type: 'text', text });
}

export function parseInline(text: string, allowLinks = true): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  while (rest) {
    const m = TOKEN.exec(rest);
    if (!m) {
      pushText(out, rest);
      break;
    }
    pushText(out, rest.slice(0, m.index));
    const [whole, code, label, href, strong, em] = m;
    if (code !== undefined) out.push({ type: 'code', text: code });
    else if (label !== undefined) {
      const safe = allowLinks ? safeHref(href!) : null;
      if (safe) out.push({ type: 'link', ...safe, children: parseInline(label, false) });
      else {
        // Not a usable link: keep the label (with its own formatting), drop the URL.
        for (const node of parseInline(label, false)) {
          if (node.type === 'text') pushText(out, node.text);
          else out.push(node);
        }
      }
    } else if (strong !== undefined) out.push({ type: 'strong', children: parseInline(strong, allowLinks) });
    else if (em !== undefined) out.push({ type: 'em', children: parseInline(em, allowLinks) });
    rest = rest.slice(m.index + whole.length);
  }
  return out;
}

const BULLET = /^\s*[-•]\s+/;

/** One stored paragraph → its blocks (usually one paragraph; bullet lines become a list). */
export function parseBlocks(paragraph: string): Block[] {
  const blocks: Block[] = [];
  for (const line of paragraph.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const last = blocks.at(-1);
    if (BULLET.test(line)) {
      const item = parseInline(line.replace(BULLET, '').trim());
      if (last?.type === 'list') last.items.push(item);
      else blocks.push({ type: 'list', items: [item] });
    } else {
      const content = parseInline(line.trim());
      if (last?.type === 'paragraph') last.lines.push(content);
      else blocks.push({ type: 'paragraph', lines: [content] });
    }
  }
  return blocks;
}

/** The text without markup (for headings in tables of contents, meta descriptions, alt text). */
export function plainText(nodes: readonly Inline[]): string {
  return nodes.map((n) => (n.type === 'text' || n.type === 'code' ? n.text : plainText(n.children))).join('');
}
