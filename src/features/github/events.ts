import { fill } from '@/i18n/paths';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { GithubCommit, GithubEvent } from '@/integrations/github/schemas';
import type { Activity, ActivityEvent } from './types';

/** "refs/heads/main" → "main". */
const shortRef = (ref: string | null | undefined) => (ref ? ref.replace(/^refs\/(heads|tags)\//, '') : null);

function subject(title: string | undefined, number: number | undefined): string | null {
  if (title) return title;
  return number ? `#${number}` : null;
}

/**
 * Normalizes a raw GitHub event into a language-neutral activity record, or
 * null for event types the portfolio doesn't show. Wording happens at render
 * time (`describeActivity`) so it can be localized.
 */
export function normalizeEvent(event: GithubEvent): Activity | null {
  const p = event.payload;
  let normalized: ActivityEvent | null = null;

  switch (event.type) {
    case 'PushEvent':
      // GitHub stopped including commit lists/counts in Oct 2025; the ref remains.
      normalized = { type: 'push', ref: shortRef(p.ref) };
      break;
    case 'CreateEvent':
      if (p.ref_type === 'branch' || p.ref_type === 'tag' || p.ref_type === 'repository') {
        normalized = { type: 'create', refType: p.ref_type, ref: shortRef(p.ref) };
      }
      break;
    case 'ReleaseEvent':
      if (p.action === 'published' || p.action === undefined) {
        normalized = { type: 'release', tag: p.release?.tag_name ?? p.release?.name ?? null };
      }
      break;
    case 'PullRequestEvent': {
      const title = subject(p.pull_request?.title, p.number ?? p.pull_request?.number);
      const action =
        p.action === 'closed' && p.pull_request?.merged ? 'merged' : p.action;
      if (title && (action === 'opened' || action === 'closed' || action === 'merged' || action === 'reopened')) {
        normalized = { type: 'pull_request', action, title };
      }
      break;
    }
    case 'IssuesEvent': {
      const title = subject(p.issue?.title, p.issue?.number);
      if (title && (p.action === 'opened' || p.action === 'closed' || p.action === 'reopened')) {
        normalized = { type: 'issue', action: p.action, title };
      }
      break;
    }
  }

  if (!normalized) return null;
  return {
    ...normalized,
    repository: event.repo.name,
    repositoryUrl: `https://github.com/${event.repo.name}`,
    createdAt: event.created_at,
  };
}

/** A default-branch commit as an activity record, timed by when it was committed. */
export function normalizeCommit(commit: GithubCommit, repository: string): Activity {
  return {
    type: 'commit',
    message: commit.commit.message.split('\n', 1)[0]!.trim(),
    url: commit.html_url,
    repository,
    repositoryUrl: `https://github.com/${repository}`,
    createdAt: commit.commit.committer?.date ?? commit.commit.author?.date ?? new Date(0).toISOString(),
  };
}

/**
 * Merges events with commits fetched directly from the repositories, which
 * are fresh while the Events API can lag by hours. Pushes to a default
 * branch whose commits were fetched are dropped, since the commits describe
 * the same work in more detail. Newest first.
 */
export function mergeActivity(
  events: readonly Activity[],
  commits: readonly Activity[],
  covered: ReadonlyMap<string, string>,
): Activity[] {
  const kept = events.filter((e) => !(e.type === 'push' && e.ref !== null && covered.get(e.repository) === e.ref));
  return [...kept, ...commits].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

type EventStrings = Dictionary['github']['events'];

const PULL_REQUEST_KEYS = {
  opened: 'pullRequestOpened',
  closed: 'pullRequestClosed',
  merged: 'pullRequestMerged',
  reopened: 'pullRequestReopened',
} as const satisfies Record<string, keyof EventStrings>;

const ISSUE_KEYS = {
  opened: 'issueOpened',
  closed: 'issueClosed',
  reopened: 'issueReopened',
} as const satisfies Record<string, keyof EventStrings>;

/** Localized one-line description of an activity. */
export function describeActivity(a: ActivityEvent, t: EventStrings): string {
  switch (a.type) {
    case 'push':
      return a.ref ? fill(t.push, { ref: a.ref }) : t.pushNoRef;
    case 'commit':
      return fill(t.commit, { message: a.message });
    case 'create':
      if (a.refType === 'repository') return t.createRepository;
      return fill(a.refType === 'branch' ? t.createBranch : t.createTag, { ref: a.ref ?? '' });
    case 'release':
      return a.tag ? fill(t.release, { tag: a.tag }) : t.releaseNoTag;
    case 'pull_request':
      return fill(t[PULL_REQUEST_KEYS[a.action]], { title: a.title });
    case 'issue':
      return fill(t[ISSUE_KEYS[a.action]], { title: a.title });
  }
}
