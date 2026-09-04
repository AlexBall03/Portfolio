export const SCREEN_IDS = ['home', 'about', 'projects', 'experience', 'resume', 'contact'];
export const idToPath = (id) => (id === 'home' ? '/' : `/${id}`);

// One icon per screen, shared by the mobile drawer and the command palette so
// the same route never gets two different glyphs. Names index into src/ui/Icon.
export const SCREEN_ICONS = {
  home: 'bolt', about: 'user', projects: 'cube',
  experience: 'briefcase', resume: 'award', contact: 'mail',
};
