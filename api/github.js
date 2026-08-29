// Vercel Function — GET /api/github (publicly routed as GET api.alexball.dev/github)
// Normalizes public GitHub profile/repo/activity data for the portfolio and API portal.
// GITHUB_TOKEN is read from process.env only — never forwarded to the client.

const GITHUB_API = 'https://api.github.com';
// Pinned to the documented default/stable REST version rather than the latest
// (2026-03-10 at time of writing) since its breaking-changes list wasn't
// verifiable against the specific fields this endpoint depends on.
const API_VERSION = '2022-11-28';

const DEFAULT_ALLOWED_ORIGINS = ['https://alexball.dev', 'http://localhost:5173'];

const REPO_PAGE_SIZE = 100;
const MAX_REPO_PAGES = 10;
const MAX_REPOSITORIES = 12;
const MAX_ACTIVITY_EVENTS = 10;
const CONTRIBUTION_WINDOW_DAYS = 182; // 26 weeks x 7 days — matches the portfolio's heatmap grid exactly

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGIN;
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  const list = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_ALLOWED_ORIGINS;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();
  res.setHeader('Vary', 'Origin');
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

class UpstreamError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function githubRest(path, token) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
    },
  });

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      throw new UpstreamError(`GitHub rate limit or forbidden (${res.status})`, 429);
    }
    throw new UpstreamError(`GitHub REST request failed (${res.status})`, 502);
  }

  return res.json();
}

async function fetchProfile(username, token) {
  const u = await githubRest(`/users/${encodeURIComponent(username)}`, token);
  return {
    username: u.login,
    name: u.name,
    avatarUrl: u.avatar_url,
    profileUrl: u.html_url,
    bio: u.bio,
    followers: u.followers,
    following: u.following,
    publicRepos: u.public_repos,
  };
}

async function fetchAllRepos(username, token) {
  const all = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const batch = await githubRest(
      `/users/${encodeURIComponent(username)}/repos?per_page=${REPO_PAGE_SIZE}&page=${page}&sort=pushed`,
      token
    );
    all.push(...batch);
    if (batch.length < REPO_PAGE_SIZE) break;
  }
  return all.filter((r) => !r.fork);
}

function summarizeRepoStats(repos) {
  return repos.reduce(
    (acc, r) => {
      acc.totalStars += r.stargazers_count || 0;
      acc.totalForks += r.forks_count || 0;
      return acc;
    },
    { totalStars: 0, totalForks: 0 }
  );
}

function normalizeRepositories(repos) {
  return [...repos]
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, MAX_REPOSITORIES)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics || [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      pushedAt: r.pushed_at,
      archived: !!r.archived,
    }));
}

function describeEvent(event) {
  const repository = event.repo?.name;
  const repositoryUrl = repository ? `https://github.com/${repository}` : null;
  const createdAt = event.created_at;

  switch (event.type) {
    case 'PushEvent': {
      const count = event.payload?.commits?.length || 0;
      return {
        type: 'push',
        repository,
        repositoryUrl,
        description: `Pushed ${count} commit${count === 1 ? '' : 's'}`,
        createdAt,
      };
    }
    case 'PullRequestEvent': {
      const action = event.payload?.action;
      const title = event.payload?.pull_request?.title;
      return {
        type: 'pull_request',
        repository,
        repositoryUrl,
        description: title ? `${action} pull request: ${title}` : `${action} a pull request`,
        createdAt,
      };
    }
    case 'CreateEvent': {
      const refType = event.payload?.ref_type;
      const ref = event.payload?.ref;
      return {
        type: 'create',
        repository,
        repositoryUrl,
        description: ref && refType !== 'repository' ? `Created ${refType} ${ref}` : `Created ${refType}`,
        createdAt,
      };
    }
    case 'ReleaseEvent': {
      const tag = event.payload?.release?.tag_name || event.payload?.release?.name;
      return {
        type: 'release',
        repository,
        repositoryUrl,
        description: tag ? `Published release ${tag}` : 'Published a release',
        createdAt,
      };
    }
    case 'IssuesEvent': {
      const action = event.payload?.action;
      const title = event.payload?.issue?.title;
      return {
        type: 'issue',
        repository,
        repositoryUrl,
        description: title ? `${action} issue: ${title}` : `${action} an issue`,
        createdAt,
      };
    }
    default:
      return null;
  }
}

async function fetchRecentActivity(username, token) {
  const events = await githubRest(`/users/${encodeURIComponent(username)}/events/public?per_page=30`, token);
  const normalized = [];
  for (const event of events) {
    const described = describeEvent(event);
    if (described) normalized.push(described);
    if (normalized.length >= MAX_ACTIVITY_EVENTS) break;
  }
  return normalized;
}

async function fetchContributionCalendar(username, token) {
  const to = new Date();
  const from = new Date(to.getTime() - CONTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(`${GITHUB_API}/graphql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { login: username, from: from.toISOString(), to: to.toISOString() },
    }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed (${res.status})`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL returned errors: ${json.errors[0]?.message || 'unknown'}`);
  }

  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error('GraphQL response missing contributionCalendar');
  }

  return {
    totalContributions: calendar.totalContributions,
    contributionCalendar: {
      weeks: calendar.weeks.map((w) => ({
        days: w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })),
      })),
    },
  };
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;

  if (!token || !username) {
    console.error('api/github: missing required env var(s)', {
      hasToken: !!token,
      hasUsername: !!username,
    });
    sendJson(res, 500, { error: 'Server configuration error' });
    return;
  }

  try {
    const [profile, repos, recentActivity] = await Promise.all([
      fetchProfile(username, token),
      fetchAllRepos(username, token),
      fetchRecentActivity(username, token),
    ]);

    const { totalStars, totalForks } = summarizeRepoStats(repos);
    const repositories = normalizeRepositories(repos);

    let contributionCalendar = null;
    let contributionsUnavailable = false;
    let totalContributions;
    try {
      const result = await fetchContributionCalendar(username, token);
      contributionCalendar = result.contributionCalendar;
      totalContributions = result.totalContributions;
    } catch (err) {
      console.error('api/github: contribution calendar unavailable —', err.message);
      contributionsUnavailable = true;
    }

    const lastActivityAt =
      recentActivity[0]?.createdAt || repositories[0]?.pushedAt || null;

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, stale-while-revalidate=1800');
    sendJson(res, 200, {
      profile,
      stats: { totalStars, totalForks, totalContributions },
      contributionCalendar,
      repositories,
      recentActivity,
      lastActivityAt,
      contributionsUnavailable,
    });
  } catch (err) {
    const status = err instanceof UpstreamError ? err.status : 502;
    console.error('api/github: upstream failure —', err.message);
    sendJson(res, status, { error: 'GitHub data is temporarily unavailable' });
  }
}
