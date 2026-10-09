export type ExperienceKind = 'career' | 'education';
export type DatePrecision = 'month' | 'year';

export interface Experience {
  id: string;
  kind: ExperienceKind;
  /** Display organization (the label when one exists, else the proper name). */
  organization: string;
  role: string;
  employmentType: string | null;
  location: string | null;
  /** ISO dates (YYYY-MM-DD). */
  startDate: string;
  endDate: string | null;
  datePrecision: DatePrecision;
  isCurrent: boolean;
  summary: string[];
  tags: string[];
}

/* ── Admin editor values ────────────────────────────────────────────────────
 * Hidden entries included, optional fields as '' rather than null.
 */

export interface ExperienceValues {
  key: string;
  id?: string;
  organization: string;
  organizationLabel: string;
  role: string;
  employmentType: string;
  location: string;
  summary: string[];
  tags: string[];
  startDate: string;
  /** '' = no end date (ongoing). */
  endDate: string;
  datePrecision: DatePrecision;
  isCurrent: boolean;
  visible: boolean;
}

export type ExperiencesValues = Record<ExperienceKind, ExperienceValues[]>;
