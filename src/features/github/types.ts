/** Contribution intensity, 0 (none) to 4 (highest quartile), as GitHub computes it. */
export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  count: number;
  level: ContributionLevel;
}

/**
 * A fixed grid of whole weeks (Sunday → Saturday), oldest first. Days after
 * "today" are `null`, so every column is a real week and every row a weekday.
 */
export interface ContributionCalendar {
  weeks: (ContributionDay | null)[][];
  total: number;
}

export type ActivityEvent =
  | { type: 'push'; ref: string | null }
  | { type: 'commit'; message: string; url: string }
  | { type: 'create'; refType: 'branch' | 'tag' | 'repository'; ref: string | null }
  | { type: 'release'; tag: string | null }
  | { type: 'pull_request'; action: 'opened' | 'closed' | 'merged' | 'reopened'; title: string }
  | { type: 'issue'; action: 'opened' | 'closed' | 'reopened'; title: string };

export type Activity = ActivityEvent & {
  repository: string;
  repositoryUrl: string;
  createdAt: string;
};

export interface GithubRepository {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string | null;
}

export interface GithubStats {
  repositories: number;
  stars: number;
  forks: number;
  followers: number;
}

/**
 * Everything the GitHub section renders. Each block is independently nullable
 * so one failed upstream call degrades only its own part of the section.
 */
export interface GithubOverview {
  username: string;
  profileUrl: string;
  avatarUrl: string | null;
  stats: GithubStats | null;
  repositories: GithubRepository[] | null;
  activity: Activity[] | null;
  calendar: ContributionCalendar | null;
  lastActivityAt: string | null;
}

/* ── Project analytics (Phase 5B) ──────────────────────────────────────────
 * Per-project GitHub data across the project's associated public
 * repositories. Language-neutral: every label is localized at render time.
 */

/** What a repository is to its project (`REPOSITORY_LABELS`). */
export type RepositoryLabel = 'frontend' | 'backend' | 'api' | 'infrastructure' | 'mobile' | 'library' | 'docs' | 'other';

/** One association, as the project stores it. `githubId` is null only for rows saved before Phase 5B. */
export interface ProjectRepoRef {
  githubId: number | null;
  owner: string;
  name: string;
  label: RepositoryLabel | null;
  isPrimary: boolean;
}

/** A public repository's normalized metadata. */
export interface RepoMetadata {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  archived: boolean;
  pushedAt: string | null;
}

/**
 * Metadata lookup outcome. `private` and `not-found` carry nothing else, so
 * no detail of a repository the public can't see is ever cached or rendered.
 */
export type RepoMetadataResult = { state: 'public'; repo: RepoMetadata } | { state: 'private' } | { state: 'not-found' };

export interface RepoCommit {
  sha: string;
  /** First line of the commit message. */
  message: string;
  url: string;
  /** Committer date (ISO). */
  date: string;
  repository: string;
  repositoryUrl: string;
}

export interface RepoRelease {
  id: number;
  tag: string;
  name: string | null;
  url: string;
  publishedAt: string;
  prerelease: boolean;
  repository: string;
}

export interface RepoContributor {
  id: number;
  login: string;
  url: string;
  avatarUrl: string;
  contributions: number;
}

/** One week of default-branch commits. `week` = its Sunday (UTC), `YYYY-MM-DD`. */
export interface ActivityWeek {
  week: string;
  count: number;
}

export type RepoActivity = { status: 'ok'; weeks: ActivityWeek[] } | { status: 'pending' };

/** Everything loaded for one public repository. A `null` part couldn't be loaded. */
export interface RepoAnalytics {
  repo: RepoMetadata;
  label: RepositoryLabel | null;
  isPrimary: boolean;
  commits: RepoCommit[] | null;
  activity: RepoActivity | null;
  languages: Record<string, number> | null;
  contributors: RepoContributor[] | null;
  /** Published (non-draft) releases, newest first; `capped` when GitHub returned a full page. */
  releases: { items: RepoRelease[]; capped: boolean } | null;
}

/** How many of the public repositories a combined figure covers. */
export interface Coverage {
  covered: number;
  of: number;
}

export interface ProjectGithubRepository extends RepoMetadata {
  label: RepositoryLabel | null;
  isPrimary: boolean;
  /** Default-branch commits in the reporting period; null when unavailable. */
  periodCommits: number | null;
}

export interface LanguageShare {
  name: string;
  bytes: number;
  /** 0–1, of all bytes across the covered repositories. */
  share: number;
}

export interface ProjectGithub {
  /**
   * `ok`: everything loaded. `partial`: something is missing, pending, or a
   * repository is unavailable. `unavailable`: no public repository could be
   * loaded. `unconfigured`: no GitHub token.
   */
  status: 'ok' | 'partial' | 'unavailable' | 'unconfigured';
  /** Public repositories, in the project's order (primary first). */
  repositories: ProjectGithubRepository[];
  /** Associations that are private, deleted, or failed to load. Never named. */
  unavailable: number;
  stars: number | null;
  forks: number | null;
  /** Weekly default-branch commits over the weeks every covered repository reports (up to 52). */
  activity: (Coverage & { weeks: ActivityWeek[]; total: number; pending: number }) | null;
  languages: (Coverage & { items: LanguageShare[]; otherShare: number }) | null;
  /** Newest first, deduplicated by SHA. */
  commits: RepoCommit[] | null;
  contributors: (Coverage & { total: number; top: RepoContributor[] }) | null;
  releases: (Coverage & { count: number; capped: boolean; recent: RepoRelease[] }) | null;
  /** Newest default-branch commit or published release seen. */
  lastActivityAt: string | null;
}
