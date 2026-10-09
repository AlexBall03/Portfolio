import type { RepositoryLabel } from './types';

/** Repository labels, in the order the editor offers them (names are in the dictionaries). */
export const REPOSITORY_LABELS = [
  'frontend',
  'backend',
  'api',
  'infrastructure',
  'mobile',
  'library',
  'docs',
  'other',
] as const satisfies readonly RepositoryLabel[];
