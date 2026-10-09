/** GitHub's colors for the languages this portfolio uses; anything else falls back to a neutral token. */
export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  'C#': '#9b6dd6',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Dart: '#00B4AB',
  SCSS: '#c6538c',
  Dockerfile: '#384d54',
  PLpgSQL: '#336790',
  'Jupyter Notebook': '#DA5B0B',
};

export const languageColor = (name: string | null) => (name && LANGUAGE_COLORS[name]) || 'var(--fg-faint)';
