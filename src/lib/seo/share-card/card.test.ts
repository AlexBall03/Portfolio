import { describe, expect, it } from 'vitest';
import { shareCardPath } from '@/config/site';
import { PAGES } from '@/config/navigation';
import { clip, parseShareCard } from './card';

describe('shareCardPath', () => {
  it('names a card per page and locale', () => {
    expect(shareCardPath('en', '/')).toBe('/og/en/home.png');
    expect(shareCardPath('es', '/about')).toBe('/og/es/about.png');
    expect(shareCardPath('en', '/projects/my-app')).toBe('/og/en/projects/my-app.png');
  });
});

describe('parseShareCard', () => {
  it('round-trips every top-level page and a project', () => {
    for (const { key, path } of PAGES) {
      const segments = shareCardPath('en', path).split('/').slice(3);
      expect(parseShareCard(segments)).toEqual({ kind: 'page', page: key });
    }
    expect(parseShareCard(['projects', 'my-app.png'])).toEqual({ kind: 'project', slug: 'my-app' });
  });

  it('rejects anything else', () => {
    expect(parseShareCard([])).toBeNull();
    expect(parseShareCard(['about'])).toBeNull();
    expect(parseShareCard(['admin.png'])).toBeNull();
    expect(parseShareCard(['projects.png', 'x'])).toBeNull();
    expect(parseShareCard(['blog', 'post.png'])).toBeNull();
    expect(parseShareCard(['projects', 'Bad_Slug.png'])).toBeNull();
    expect(parseShareCard(['projects', 'a', 'b.png'])).toBeNull();
  });
});

describe('clip', () => {
  it('keeps short text and collapses whitespace', () => {
    expect(clip('  Hello\n world ', 20)).toBe('Hello world');
  });

  it('cuts long text at a word boundary with an ellipsis', () => {
    const out = clip('Software engineer focused on full-stack development, backend systems, and DevOps.', 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out).toBe('Software engineer focused on full-stack…');
  });
});
