import type { IconName } from '@/components/ui/Icon';
import { copy, fill } from '@/config/copy';
import { PLATFORM_ICONS, type ChromeData } from './types';

export const GROUP_ORDER = ['nav', 'actions', 'profiles'] as const;
export type CommandGroup = (typeof GROUP_ORDER)[number];

export interface Command {
  id: string;
  group: CommandGroup;
  label: string;
  hint?: string | null;
  icon: IconName;
  keywords: readonly string[];
  /** Opens a new tab (shows an outward arrow). */
  external?: boolean;
  /** Keeps the palette open after running (e.g. to show "copied"). */
  keepOpen?: boolean;
  run: () => void;
}

export interface CommandHandlers {
  navigate: (href: string) => void;
  openExternal: (url: string) => void;
  download: (href: string) => void;
  copy: (text: string) => void;
  toggleTheme: () => void;
}

/**
 * Builds the palette's commands from what the site already publishes: the
 * page list, the owner's contact details, and their social links. Side
 * effects are injected so this stays pure data assembly.
 */
export function buildCommands(
  data: Pick<ChromeData, 'pages' | 'email' | 'resume' | 'socials'>,
  theme: 'dark' | 'light',
  handlers: CommandHandlers,
): Command[] {
  const T = copy.palette;
  const resume = data.resume;
  const kw = T.keywords;

  const nav: Command[] = data.pages.map((p) => ({
    id: `nav-${p.key}`,
    group: 'nav',
    label: p.label,
    hint: p.description,
    icon: p.icon,
    keywords: kw[p.key],
    run: () => handlers.navigate(p.href),
  }));

  const actions: Command[] = [
    ...(resume
      ? [
          {
            id: 'action-resume',
            group: 'actions' as const,
            label: T.downloadResume,
            hint: resume.fileName,
            icon: 'download' as const,
            keywords: kw.downloadResume,
            run: () => handlers.download(resume.href),
          },
        ]
      : []),
    {
      id: 'action-email',
      group: 'actions',
      label: T.copyEmail,
      hint: data.email,
      icon: 'mail',
      keywords: kw.copyEmail,
      keepOpen: true,
      run: () => handlers.copy(data.email),
    },
    {
      id: 'action-theme',
      group: 'actions',
      label: theme === 'dark' ? T.themeLight : T.themeDark,
      icon: theme === 'dark' ? 'sun' : 'moon',
      keywords: kw.theme,
      run: handlers.toggleTheme,
    },
  ];

  const profiles: Command[] = data.socials.map((s) => ({
    id: `profile-${s.platform}`,
    group: 'profiles',
    label: fill(T.openProfile, { platform: s.label }),
    hint: s.handle,
    icon: PLATFORM_ICONS[s.platform],
    keywords: [...kw.profiles, s.platform, s.label],
    external: true,
    run: () => handlers.openExternal(s.url),
  }));

  return [...nav, ...actions, ...profiles];
}

/** Case- and accent-insensitive, so "curriculum" finds "Currículum". */
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

/**
 * 3 = the label starts with the query, 2 = a word in it does, 1 = a keyword
 * does, 0 = no match. Word-start matching keeps results predictable: "res"
 * finds Resume without also matching "add-res-s".
 */
function score(cmd: Command, q: string): number {
  const label = norm(cmd.label);
  if (label.startsWith(q)) return 3;
  if (words(label).some((w) => w.startsWith(q))) return 2;
  if (cmd.keywords.some((k) => words(k).some((w) => w.startsWith(q)))) return 1;
  return 0;
}

/** Commands in render order: groups fixed, best matches first within a group. */
export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const q = norm(query).trim();
  const ranked = commands
    .map((cmd, i) => ({ cmd, i, s: q ? score(cmd, q) : 0 }))
    .filter((r) => !q || r.s > 0);

  return GROUP_ORDER.flatMap((group) =>
    ranked
      .filter((r) => r.cmd.group === group)
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((r) => r.cmd),
  );
}
