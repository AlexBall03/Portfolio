import { describe, expect, it, vi } from 'vitest';
import { copy } from '@/config/copy';
import { PAGES } from '@/config/navigation';
import { buildCommands, filterCommands, type CommandHandlers } from './commands';

const handlers: CommandHandlers = {
  navigate: vi.fn(),
  openExternal: vi.fn(),
  download: vi.fn(),
  copy: vi.fn(),
  toggleTheme: vi.fn(),
};

const build = () =>
  buildCommands(
    {
      pages: PAGES.map((p) => ({ ...p, href: p.path, label: copy.nav[p.key], description: null })),
      email: 'contact@alexball.dev',
      resume: { href: '/resume.pdf?v=0123abcd', fileName: 'Alexander-Ball-Resume.pdf' },
      socials: [{ platform: 'github', label: 'GitHub', url: 'https://github.com/AlexBall03', handle: '@AlexBall03' }],
    },
    'dark',
    handlers,
  );

const labels = (cmds: { label: string }[]) => cmds.map((c) => c.label);

describe('command palette', () => {
  it('keeps the declared order for an empty query', () => {
    const cmds = build();
    expect(filterCommands(cmds, '')).toEqual(cmds);
  });

  it('matches word starts, not arbitrary substrings', () => {
    expect(labels(filterCommands(build(), 'res'))).toEqual(['Resume', 'Download resume']);
  });

  it('finds commands through keywords', () => {
    expect(labels(filterCommands(build(), 'work'))).toEqual(['Projects', 'Experience']);
  });

  it('ignores accents and case', () => {
    expect(filterCommands([{ ...build()[0]!, label: 'Currículum' }], 'CURRICULUM')).toHaveLength(1);
  });

  it('builds profile commands from social links', () => {
    const github = build().find((c) => c.id === 'profile-github')!;
    expect(github.label).toBe('Open GitHub profile');
    github.run();
    expect(handlers.openExternal).toHaveBeenCalledWith('https://github.com/AlexBall03');
  });
});
