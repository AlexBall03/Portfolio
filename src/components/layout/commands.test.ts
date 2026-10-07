import { describe, expect, it, vi } from 'vitest';
import { PAGES } from '@/config/navigation';
import { en } from '@/i18n/dictionaries/en';
import { es } from '@/i18n/dictionaries/es';
import { buildCommands, filterCommands, type CommandHandlers } from './commands';

const handlers: CommandHandlers = {
  navigate: vi.fn(),
  openExternal: vi.fn(),
  download: vi.fn(),
  copy: vi.fn(),
  toggleTheme: vi.fn(),
  toggleLocale: vi.fn(),
};

const build = (dict: typeof en) =>
  buildCommands(
    {
      dict,
      pages: PAGES.map((p) => ({ ...p, href: p.path, label: dict.nav[p.key], description: null })),
      email: 'contact@alexball.dev',
      resumeHref: '/assets/Alexander-Ball-Resume.pdf',
      socials: [{ platform: 'github', label: 'GitHub', url: 'https://github.com/AlexBall03', handle: '@AlexBall03' }],
    },
    'dark',
    handlers,
  );

const labels = (cmds: { label: string }[]) => cmds.map((c) => c.label);

describe('command palette', () => {
  it('keeps the declared order for an empty query', () => {
    const cmds = build(en);
    expect(filterCommands(cmds, '')).toEqual(cmds);
  });

  it('matches word starts, not arbitrary substrings', () => {
    expect(labels(filterCommands(build(en), 'res'))).toEqual(['Resume', 'Download resume']);
  });

  it('finds commands through keywords', () => {
    expect(labels(filterCommands(build(en), 'work'))).toEqual(['Projects', 'Experience']);
  });

  it('ignores accents and case', () => {
    expect(labels(filterCommands(build(es), 'CURRICULUM'))[0]).toBe('Currículum');
  });

  it('builds profile commands from social links', () => {
    const github = build(en).find((c) => c.id === 'profile-github')!;
    expect(github.label).toBe('Open GitHub profile');
    github.run();
    expect(handlers.openExternal).toHaveBeenCalledWith('https://github.com/AlexBall03');
  });
});
