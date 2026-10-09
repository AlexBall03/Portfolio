import 'server-only';
import { z } from 'zod';
import { githubEnv } from '@/config/env';
import { isOwner, isRepositoryName, type RepositoryRef } from '@/lib/github-repository';
import {
  contributionCalendarResponseSchema,
  githubCommitActivitySchema,
  githubCommitSchema,
  githubContributorSchema,
  githubEventSchema,
  githubLanguagesSchema,
  githubReleaseSchema,
  githubRepoDetailSchema,
  githubRepoSchema,
  githubUserSchema,
  type ContributionCalendarResponse,
  type GithubCommit,
  type GithubCommitActivity,
  type GithubContributor,
  type GithubEvent,
  type GithubLanguages,
  type GithubRelease,
  type GithubRepo,
  type GithubRepoDetail,
  type GithubUser,
} from './schemas';

/**
 * Thin, typed GitHub REST client. Every response is validated at this
 * boundary; nothing outside src/integrations/github sees raw GitHub payloads.
 * Requests go only to api.github.com, on paths built from validated
 * identifiers (never from a URL someone entered). The token stays server-side.
 */

const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const TIMEOUT_MS = 8_000;
const MAX_REPO_PAGES = 5;
const MAX_CONTRIBUTOR_PAGES = 5;

export type GithubErrorKind = 'config' | 'rate-limited' | 'forbidden' | 'not-found' | 'upstream' | 'invalid-response';

export class GithubError extends Error {
  override name = 'GithubError';
  constructor(
    readonly kind: GithubErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/**
 * A request GitHub may answer without data: `pending` while it computes
 * statistics (202), `empty` for a repository with no commits (204 / 409).
 */
export type GithubOutcome<T> = { status: 'ok'; data: T } | { status: 'pending' } | { status: 'empty' };

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${githubEnv().GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'alexball.dev',
  };
}

/** A 403 is a rate limit only when GitHub says so; otherwise access is refused (e.g. a blocked repository). */
export function classifyFailure(res: Pick<Response, 'status' | 'headers'>): GithubError {
  const limited =
    res.status === 429 ||
    (res.status === 403 && (res.headers.get('x-ratelimit-remaining') === '0' || res.headers.has('retry-after')));
  if (limited) return new GithubError('rate-limited', `GitHub rate limit (${res.status})`);
  if (res.status === 403 || res.status === 451) return new GithubError('forbidden', `GitHub refused access (${res.status})`);
  if (res.status === 404 || res.status === 410) return new GithubError('not-found', 'GitHub resource not found');
  return new GithubError('upstream', `GitHub responded ${res.status}`);
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    if (err instanceof Error && err.name === 'ConfigError') throw new GithubError('config', err.message);
    throw new GithubError('upstream', `GitHub request failed: ${(err as Error).message}`);
  }
  // 409: GitHub's answer for commit-based endpoints of an empty repository.
  if (!res.ok && res.status !== 409) throw classifyFailure(res);
  return res;
}

async function parse<T extends z.ZodType>(res: Response, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new GithubError('invalid-response', 'GitHub returned a body that is not JSON');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new GithubError('invalid-response', `Unexpected GitHub response: ${parsed.error.issues[0]?.message}`);
  }
  return parsed.data;
}

async function requestOutcome<T extends z.ZodType>(path: string, schema: T): Promise<GithubOutcome<z.infer<T>>> {
  const res = await send(path);
  if (res.status === 202) return { status: 'pending' };
  if (res.status === 204 || res.status === 409) return { status: 'empty' };
  return { status: 'ok', data: await parse(res, schema) };
}

async function request<T extends z.ZodType>(path: string, schema: T, init?: RequestInit): Promise<z.infer<T>> {
  const res = await send(path, init);
  if (res.status !== 200 && res.status !== 201) throw new GithubError('upstream', `GitHub responded ${res.status} without data`);
  return parse(res, schema);
}

const user = (username: string) => encodeURIComponent(username);

/** `/repos/{owner}/{name}` from a full name, refusing anything that isn't a valid owner/name pair. */
function repoPath(fullName: string): string {
  const [owner = '', name = '', ...rest] = fullName.split('/');
  if (rest.length || !isOwner(owner) || !isRepositoryName(name)) {
    throw new GithubError('not-found', 'Not a valid repository name');
  }
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

export function fetchUser(username: string): Promise<GithubUser> {
  return request(`/users/${user(username)}`, githubUserSchema);
}

/** All public repositories owned by the user (paginated). */
export async function fetchRepos(username: string): Promise<GithubRepo[]> {
  const all: GithubRepo[] = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const batch = await request(
      `/users/${user(username)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`,
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
  const raw = await request(`/users/${user(username)}/events/public?per_page=100`, z.array(z.unknown()));
  return raw.flatMap((e) => {
    const parsed = githubEventSchema.safeParse(e);
    return parsed.success ? [parsed.data] : [];
  });
}

/** The author's latest commits on a repository's default branch, newest first. */
export async function fetchRecentCommits(fullName: string, author: string, since: Date): Promise<GithubCommit[]> {
  const params = new URLSearchParams({ author, since: since.toISOString(), per_page: '5' });
  return request(`${repoPath(fullName)}/commits?${params}`, z.array(githubCommitSchema));
}

/* ── One repository (project analytics) ─────────────────────────────────── */

/**
 * A repository by its stable id (follows renames and transfers) or by name.
 * The caller must check `private`/`visibility`: an authenticated token can
 * see repositories the public can't.
 */
export async function fetchRepository(ref: { id: number } | RepositoryRef): Promise<GithubRepoDetail> {
  const path =
    'id' in ref
      ? `/repositories/${Math.trunc(ref.id)}`
      : repoPath(`${ref.owner}/${ref.name}`);
  return request(path, githubRepoDetailSchema);
}

/** Latest commits on the default branch (any author), newest first. */
export async function fetchDefaultBranchCommits(fullName: string, perPage = 10): Promise<GithubOutcome<GithubCommit[]>> {
  return requestOutcome(`${repoPath(fullName)}/commits?per_page=${perPage}`, z.array(githubCommitSchema));
}

/** Weekly default-branch commit totals for the last 52 weeks, as GitHub computes them (202 while computing). */
export async function fetchCommitActivity(fullName: string): Promise<GithubOutcome<GithubCommitActivity>> {
  return requestOutcome(`${repoPath(fullName)}/stats/commit_activity`, githubCommitActivitySchema);
}

export async function fetchLanguages(fullName: string): Promise<GithubLanguages> {
  return request(`${repoPath(fullName)}/languages`, githubLanguagesSchema);
}

/** Contributors with a GitHub account, most commits first (GitHub lists at most 500). */
export async function fetchContributors(fullName: string): Promise<GithubOutcome<GithubContributor[]>> {
  const all: GithubContributor[] = [];
  for (let page = 1; page <= MAX_CONTRIBUTOR_PAGES; page++) {
    const batch = await requestOutcome(
      `${repoPath(fullName)}/contributors?per_page=100&page=${page}`,
      z.array(githubContributorSchema),
    );
    if (batch.status !== 'ok') {
      if (page === 1) return batch;
      // Never pass a partial list off as the whole one.
      throw new GithubError('upstream', 'GitHub contributors changed while paging');
    }
    all.push(...batch.data);
    if (batch.data.length < 100) break;
  }
  return { status: 'ok', data: all };
}

/** The latest 100 releases. Includes drafts when the token can see them: callers must filter. */
export async function fetchReleases(fullName: string): Promise<GithubRelease[]> {
  return request(`${repoPath(fullName)}/releases?per_page=100`, z.array(githubReleaseSchema));
}

/* ── GraphQL (the global section's contribution calendar) ───────────────── */

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
    '/graphql',
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
