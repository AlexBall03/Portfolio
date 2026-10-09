import { describe, expect, it } from 'vitest';
import { parseRepositoryRef } from './github-repository';

describe('parseRepositoryRef', () => {
  it.each([
    ['AlexBall03/Portfolio', 'AlexBall03', 'Portfolio'],
    ['  AlexBall03/Portfolio  ', 'AlexBall03', 'Portfolio'],
    ['https://github.com/AlexBall03/Portfolio', 'AlexBall03', 'Portfolio'],
    ['https://github.com/AlexBall03/Portfolio/', 'AlexBall03', 'Portfolio'],
    ['https://github.com/AlexBall03/Portfolio.git', 'AlexBall03', 'Portfolio'],
    ['https://www.github.com/AlexBall03/Portfolio/tree/dev/src', 'AlexBall03', 'Portfolio'],
    ['https://github.com/AlexBall03/Portfolio?tab=readme-ov-file#setup', 'AlexBall03', 'Portfolio'],
    ['http://github.com/a-b/c.d_e', 'a-b', 'c.d_e'],
    ['github.com/AlexBall03/Weather', 'AlexBall03', 'Weather'],
    ['GitHub.com/AlexBall03/Weather', 'AlexBall03', 'Weather'],
    ['git@github.com:AlexBall03/Weather.git', 'AlexBall03', 'Weather'],
  ])('accepts %s', (input, owner, name) => {
    expect(parseRepositoryRef(input)).toEqual({ owner, name });
  });

  it.each([
    '',
    'portfolio',
    'a/b/c',
    'https://gitlab.com/a/b',
    'https://github.com.evil.example/a/b',
    'https://evil.example/github.com/a/b',
    'https://github.com:8443/a/b',
    'https://user:pass@github.com/a/b',
    'https://github.com/a',
    'https://github.com/a/../b',
    'a/..',
    'a/.',
    'https://github.com/a%2Fb/c',
    'a/b c',
    '-leading/repo',
    'trailing-/repo',
    'double--hyphen/repo',
    `${'x'.repeat(40)}/repo`,
    `owner/${'x'.repeat(101)}`,
    'owner/re$po',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'git@gitlab.com:a/b.git',
  ])('rejects %j', (input) => {
    expect(parseRepositoryRef(input)).toBeNull();
  });
});
