export type ExperienceKind = 'career' | 'education';
export type DatePrecision = 'month' | 'year';

export interface Experience {
  id: string;
  kind: ExperienceKind;
  /** Display organization (translated label when one exists, else the proper name). */
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
