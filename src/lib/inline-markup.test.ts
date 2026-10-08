import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline, plainText, safeHref } from './inline-markup';

describe('parseInline', () => {
  it('parses bold, emphasis, code, and links', () => {
    expect(parseInline('A **bold** and *quiet* `npm run check` [docs](https://nextjs.org/docs).')).toEqual([
      { type: 'text', text: 'A ' },
      { type: 'strong', children: [{ type: 'text', text: 'bold' }] },
      { type: 'text', text: ' and ' },
      { type: 'em', children: [{ type: 'text', text: 'quiet' }] },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'npm run check' },
      { type: 'text', text: ' ' },
      { type: 'link', href: 'https://nextjs.org/docs', external: true, children: [{ type: 'text', text: 'docs' }] },
      { type: 'text', text: '.' },
    ]);
  });

  it('never produces a link for unsafe schemes', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.example']) {
      const nodes = parseInline(`[click](${href})`);
      expect(nodes.some((n) => n.type === 'link')).toBe(false);
      expect(plainText(nodes)).toContain('click');
    }
  });

  it('allows site paths and keeps them internal', () => {
    expect(parseInline('[about](/about)')).toEqual([
      { type: 'link', href: '/about', external: false, children: [{ type: 'text', text: 'about' }] },
    ]);
  });

  it('leaves stray markers and HTML as plain text', () => {
    expect(parseInline('5 * 3 = 15, a ** b, <script>x</script>')).toEqual([
      { type: 'text', text: '5 * 3 = 15, a ** b, <script>x</script>' },
    ]);
  });

  it('does not nest links inside link labels', () => {
    const nodes = parseInline('[**see** [x](https://a.dev)](https://b.dev)');
    for (const node of nodes) {
      if (node.type === 'link') expect(JSON.stringify(node.children)).not.toContain('"link"');
    }
  });
});

describe('parseBlocks', () => {
  it('groups bullet lines into a list and keeps paragraph line breaks', () => {
    const blocks = parseBlocks('Intro line\nsecond line\n- one\n- **two**');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      lines: [[{ type: 'text', text: 'Intro line' }], [{ type: 'text', text: 'second line' }]],
    });
    expect(blocks[1]).toEqual({
      type: 'list',
      items: [[{ type: 'text', text: 'one' }], [{ type: 'strong', children: [{ type: 'text', text: 'two' }] }]],
    });
  });
});

describe('safeHref', () => {
  it('accepts http(s) and site paths only', () => {
    expect(safeHref('https://alexball.dev')?.external).toBe(true);
    expect(safeHref('/projects')?.external).toBe(false);
    expect(safeHref('mailto:a@b.c')).toBeNull();
    expect(safeHref('JavaScript:alert(1)')).toBeNull();
  });
});
