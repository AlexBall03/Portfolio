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
  stats: GithubStats | null;
  repositories: GithubRepository[] | null;
  activity: Activity[] | null;
  calendar: ContributionCalendar | null;
  lastActivityAt: string | null;
}
