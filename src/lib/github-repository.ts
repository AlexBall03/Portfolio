/**
 * Parsing of admin-entered repository references. The result is only ever
 * used to build `api.github.com` paths (each segment validated here and
 * percent-encoded by the client), never fetched as a URL, so a reference can't
 * point a server request anywhere else.
 */

export interface RepositoryRef {
  owner: string;
  name: string;
}

/** GitHub user/organization names: 1–39 letters, digits, or single hyphens, not leading. */
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
/** Repository names: letters, digits, ".", "-", "_" (GitHub's own rule), at most 100. */
const NAME = /^[A-Za-z0-9._-]{1,100}$/;

export const isOwner = (s: string) => OWNER.test(s);
export const isRepositoryName = (s: string) => NAME.test(s) && s !== '.' && s !== '..';

function fromPath(path: string): RepositoryRef | null {
  // Anything after owner/name is a page of that repository (tree/…, issues…) and is ignored.
  const [owner = '', rawName = ''] = path.split('/');
  const name = rawName.endsWith('.git') ? rawName.slice(0, -4) : rawName;
  return isOwner(owner) && isRepositoryName(name) ? { owner, name } : null;
}

/**
 * Accepts `owner/name`, `https://github.com/owner/name` (optionally `.git`, a
 * trailing slash, or a deeper repository page), `github.com/owner/name`, and
 * `git@github.com:owner/name.git`. Anything else is null: other hosts, ports,
 * credentials, percent-encoding, `..` segments, or invalid names. Query
 * strings and fragments of a pasted URL are ignored.
 */
export function parseRepositoryRef(input: string): RepositoryRef | null {
  const value = input.trim();
  if (!value || value.length > 300 || /[\s%\\]/.test(value)) return null;
  // `..` segments would be resolved away by URL parsing; refuse them outright.
  if (value.split(/[/:]/).includes('..')) return null;

  const ssh = /^git@github\.com:(.+)$/i.exec(value);
  if (ssh) return fromPath(ssh[1]!);

  if (/^(https?:\/\/)?(www\.)?github\.com\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase();
    if ((host !== 'github.com' && host !== 'www.github.com') || url.port || url.username || url.password) return null;
    return fromPath(url.pathname.replace(/^\/+/, '').replace(/\/+$/, ''));
  }

  // Bare `owner/name`: exactly two segments.
  if (value.includes(':') || value.split('/').length !== 2) return null;
  return fromPath(value);
}

export const formatRepositoryRef = (ref: RepositoryRef) => `${ref.owner}/${ref.name}`;
