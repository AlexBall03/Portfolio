import 'server-only';
import { z } from 'zod';
import { githubEnv } from '@/config/env';
import {
  contributionCalendarResponseSchema,
  githubCommitSchema,
  githubEventSchema,
  githubRepoSchema,
  githubUserSchema,
  type ContributionCalendarResponse,
  type GithubCommit,
  type GithubEvent,
  type GithubRepo,
  type GithubUser,
} from './schemas';

/**
 * Thin, typed GitHub API client. Every response is validated at this boundary;
 * nothing outside src/integrations/github sees raw GitHub payloads.
 */

const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const TIMEOUT_MS = 8_000;
const MAX_REPO_PAGES = 5;

export type GithubErrorKind = 'config' | 'rate-limited' | 'not-found' | 'upstream' | 'invalid-response';

export class GithubError extends Error {
  override name = 'GithubError';
  constructor(
    readonly kind: GithubErrorKind,
    message: string,
  ) {
    super(message);
  }
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${githubEnv().GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'alexball.dev',
  };
}

async function request<T extends z.ZodType>(url: string, schema: T, init?: RequestInit): Promise<z.infer<T>> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    if (err instanceof Error && err.name === 'ConfigError') throw new GithubError('config', err.message);
    throw new GithubError('upstream', `GitHub request failed: ${(err as Error).message}`);
  }

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) throw new GithubError('rate-limited', `GitHub ${res.status}`);
    if (res.status === 404) throw new GithubError('not-found', 'GitHub resource not found');
    throw new GithubError('upstream', `GitHub responded ${res.status}`);
  }

  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) {
    throw new GithubError('invalid-response', `Unexpected GitHub response: ${parsed.error.issues[0]?.message}`);
  }
  return parsed.data;
}

const user = (username: string) => encodeURIComponent(username);

export function fetchUser(username: string): Promise<GithubUser> {
  return request(`${API}/users/${user(username)}`, githubUserSchema);
}

/** All public repositories owned by the user (paginated). */
export async function fetchRepos(username: string): Promise<GithubRepo[]> {
  const all: GithubRepo[] = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const batch = await request(
      `${API}/users/${user(username)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`,
      z.array(githubRepoSchema),
    );
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/**
 * Recent public events. Unrecognized event shapes are dropped, not fatal.
 * The Events API lags by hours and isn't chronological, so take a full page.
 */
export async function fetchPublicEvents(username: string): Promise<GithubEvent[]> {
  const raw = await request(`${API}/users/${user(username)}/events/public?per_page=100`, z.array(z.unknown()));
  return raw.flatMap((e) => {
    const parsed = githubEventSchema.safeParse(e);
    return parsed.success ? [parsed.data] : [];
  });
}

/** The author's latest commits on a repository's default branch, newest first. */
export function fetchRecentCommits(fullName: string, author: string, since: Date): Promise<GithubCommit[]> {
  const [owner = '', repo = ''] = fullName.split('/');
  const params = new URLSearchParams({ author, since: since.toISOString(), per_page: '5' });
  return request(
    `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${params}`,
    z.array(githubCommitSchema),
  );
}

const CONTRIBUTIONS_QUERY = /* GraphQL */ `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

export async function fetchContributionCalendar(
  username: string,
  from: Date,
  to: Date,
): Promise<NonNullable<ContributionCalendarResponse['data']['user']>> {
  const body = await request(
    `${API}/graphql`,
    contributionCalendarResponseSchema.or(z.object({ errors: z.array(z.object({ message: z.string() })) })),
    {
      method: 'POST',
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: { login: username, from: from.toISOString(), to: to.toISOString() },
      }),
    },
  );
  if ('errors' in body) throw new GithubError('upstream', `GraphQL error: ${body.errors[0]?.message}`);
  if (!body.data.user) throw new GithubError('not-found', 'GitHub user not found');
  return body.data.user;
}
