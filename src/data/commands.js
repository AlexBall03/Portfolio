import { SCREEN_ICONS } from './screens';

// Groups render in this order and never reorder while filtering, so the list a
// visitor sees is the list the arrow keys walk.
export const GROUP_ORDER = ['nav', 'actions', 'profiles'];

// Builds the palette's command list out of what the site already publishes:
// the hydrated `screens` array App.jsx hands to Nav/Footer/Pager, the identity
// block from siteData, and the current locale's strings. Nothing here is a
// second source of truth for a route, a label, or a URL.
//
// `handlers` carries the side effects the palette owns (routing, opening a tab,
// the clipboard) so this stays a pure data assembly.
export function buildCommands({ screens, identity, strings, theme, handlers }) {
  const T = strings.palette;
  const kw = T.keywords;
  const descriptions = strings.pager?.descriptions || {};

  const nav = screens.map((s) => ({
    id: `nav-${s.id}`,
    group: 'nav',
    label: s.label,
    hint: descriptions[s.id],
    icon: SCREEN_ICONS[s.id],
    keywords: kw[s.id] || [],
    run: () => handlers.navigate(s.path),
  }));

  const actions = [
    {
      id: 'action-resume',
      group: 'actions',
      label: T.downloadResume,
      hint: T.downloadResumeHint,
      icon: 'download',
      keywords: kw.downloadResume,
      run: () => handlers.download(identity.resume),
    },
    {
      id: 'action-email',
      group: 'actions',
      label: T.copyEmail,
      hint: identity.email,
      icon: 'mail',
      keywords: kw.copyEmail,
      // The only command that doesn't close the palette immediately — it swaps
      // to a confirmation first, since a copy leaves nothing else to see.
      keepOpen: true,
      run: () => handlers.copy(identity.email),
    },
    {
      id: 'action-theme',
      group: 'actions',
      label: theme === 'dark' ? T.themeLight : T.themeDark,
      icon: theme === 'dark' ? 'sun' : 'moon',
      keywords: kw.theme,
      run: () => handlers.toggleTheme(),
    },
    {
      id: 'action-locale',
      group: 'actions',
      label: T.language,
      icon: 'languages',
      keywords: kw.language,
      run: () => handlers.toggleLocale(),
    },
  ];

  const profiles = [
    {
      id: 'profile-github',
      group: 'profiles',
      label: T.github,
      hint: `@${identity.githubHandle}`,
      icon: 'github',
      keywords: kw.github,
      external: true,
      run: () => handlers.openExternal(identity.github),
    },
    {
      id: 'profile-linkedin',
      group: 'profiles',
      label: T.linkedin,
      hint: 'in/alexball03',
      icon: 'linkedin',
      keywords: kw.linkedin,
      external: true,
      run: () => handlers.openExternal(identity.linkedin),
    },
  ];

  return [...nav, ...actions, ...profiles];
}

// Case- and accent-insensitive, so "curriculum" finds "Currículum" in Spanish.
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// 3 = the whole label starts with the query, 2 = some word in it does,
// 1 = some keyword does, 0 = no match.
//
// Matching on word starts rather than any substring is what keeps the results
// predictable: "res" finds Resume and Download resume without also dragging in
// "Copy email add-res-s". Twelve commands don't need anything cleverer.
const words = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

function score(cmd, q) {
  const label = norm(cmd.label);
  if (label.startsWith(q)) return 3;
  if (words(label).some((w) => w.startsWith(q))) return 2;
  if (cmd.keywords.some((k) => words(k).some((w) => w.startsWith(q)))) return 1;
  return 0;
}

// Returns the commands in render order: groups fixed, and within a group the
// best matches first. An empty query leaves the declared order untouched.
export function filterCommands(commands, query) {
  const q = norm(query).trim();
  const ranked = q
    ? commands.map((cmd, i) => ({ cmd, i, s: score(cmd, q) })).filter((r) => r.s > 0)
    : commands.map((cmd, i) => ({ cmd, i, s: 0 }));

  return GROUP_ORDER.flatMap((group) =>
    ranked
      .filter((r) => r.cmd.group === group)
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((r) => r.cmd)
  );
}
