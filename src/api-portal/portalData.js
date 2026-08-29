// Single source of truth for the API portal. Add a new endpoint here (plus its
// `api/*.js` function and, if it needs a clean path, a vercel.json rewrite) —
// the portal renders entirely from this list, nothing else needs to change.
export const ENDPOINTS = [
  {
    name: 'GitHub',
    method: 'GET',
    path: '/github',
    description: 'Public GitHub profile, repository statistics, repositories, and recent development activity.',
    status: 'operational',
  },
];

export const PORTAL_META = {
  portfolioUrl: 'https://alexball.dev',
  githubUrl: 'https://github.com/AlexBall03',
  version: 'v1',
};
