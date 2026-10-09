import { z } from 'zod';
import { blankToNull, contentStatus, isoDate, nullableText, text } from '@/lib/validation';

/** The text of an entry: role, details, summary paragraphs, and tags. */
export const experienceTextInput = z.object({
  /** Replaces the organization for non-proper-noun entries ("Career break", "Homeschool"). */
  organizationLabel: nullableText(150),
  role: text(150),
  employmentType: nullableText(60),
  location: nullableText(150),
  summary: z.array(text(2000)).max(12, 'At most 12 paragraphs').default([]),
  tags: z.array(text(60)).max(12, 'At most 12 tags').default([]),
});

const endAfterStart = { message: 'End date must be on or after the start date', path: ['endDate'] };

export const experienceInput = z
  .object({
    kind: z.enum(['career', 'education']),
    organization: text(150),
    startDate: isoDate,
    endDate: isoDate.nullish(),
    datePrecision: z.enum(['month', 'year']).default('month'),
    isCurrent: z.boolean().default(false),
    status: contentStatus.default('published'),
    ...experienceTextInput.shape,
  })
  .refine((e) => !e.endDate || e.endDate >= e.startDate, endAfterStart);
export type ExperienceInput = z.infer<typeof experienceInput>;

/* ── Admin editor ───────────────────────────────────────────────────────────
 * Both lists in one save; the kind comes from the list an entry is in and
 * list position is the public order. Dates: an end is never before the
 * start, a past entry has an end, and a current one is open-ended ("Present")
 * or ends in the future ("Expected").
 */

const today = () => new Date().toISOString().slice(0, 10);

const experienceItem = z
  .object({
    id: z.uuid().optional(),
    organization: text(150),
    startDate: isoDate,
    endDate: blankToNull(isoDate.nullish()),
    datePrecision: z.enum(['month', 'year']).default('month'),
    isCurrent: z.boolean().default(false),
    visible: z.boolean().default(true),
    ...experienceTextInput.shape,
  })
  .refine((e) => !e.endDate || e.endDate >= e.startDate, endAfterStart)
  .refine((e) => e.isCurrent || e.endDate, {
    message: 'Add an end date, or mark this entry as current',
    path: ['endDate'],
  })
  .refine((e) => !e.isCurrent || !e.endDate || e.endDate >= today(), {
    message: 'A current entry can’t have ended: clear the end date or turn off Current',
    path: ['endDate'],
  });

export const experiencesInput = z.object({
  career: z.array(experienceItem).max(30, 'At most 30 entries'),
  education: z.array(experienceItem).max(30, 'At most 30 entries'),
});
export type ExperiencesInput = z.infer<typeof experiencesInput>;
