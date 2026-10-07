import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: ['.next/**', 'node_modules/**', 'src/db/migrations/**', 'scripts/**', 'next-env.d.ts'] },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    },
  },
  {
    // db/cli is script-only (it reads .env.local from disk); keep it out of the app's module graph.
    files: ['src/**'],
    ignores: ['src/db/cli/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/db/cli/*', '**/cli/local-env'], message: 'db/cli is for the db:* scripts only.' }] },
      ],
    },
  },
];

export default config;
