/** One uploaded resume PDF, as the admin's version history shows it. */
export interface ResumeVersion {
  id: string;
  label: string | null;
  fileName: string;
  sizeBytes: number;
  isPublished: boolean;
  /** ISO timestamps. */
  uploadedAt: string;
  publishedAt: string | null;
  /** Clerk user ID of the uploader; null if unknown. */
  uploadedBy: string | null;
}

/** What the public site needs about the published resume; no storage details. */
export interface PublishedResume {
  id: string;
  fileName: string;
  sizeBytes: number;
  /** The public URL: `/resume.pdf?v=<id>`, so a new publication is never served from a stale cache. */
  href: string;
}

/** The public, stable URL of whichever version is published. */
export const PUBLIC_RESUME_PATH = '/resume.pdf';

export const publicResumeHref = (id: string) => `${PUBLIC_RESUME_PATH}?v=${id.slice(0, 8)}`;

/** The admin-only URL of any version (`?download=1` for an attachment). */
export const adminResumeFileHref = (id: string, download = false) =>
  `/api/admin/resume/${id}${download ? '?download=1' : ''}`;

/** The Resume admin page's state; every resume operation returns it. */
export interface ResumeAdminValues {
  versions: ResumeVersion[];
  /** Whether the private store is connected in this environment. */
  storageConfigured: boolean;
}
