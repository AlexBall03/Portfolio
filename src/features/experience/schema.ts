import { z } from 'zod';
import { contentStatus, isoDate, localized, optionalText, text } from '@/lib/validation';

export const experienceInput = z
  .object({
    kind: z.enum(['career', 'education']),
    organization: text(150),
    startDate: isoDate,
    endDate: isoDate.nullish(),
    datePrecision: z.enum(['month', 'year']).default('month'),
    isCurrent: z.boolean().default(false),
    status: contentStatus.default('published'),
    translations: localized(
      z.object({
        organizationLabel: optionalText(150),
        role: text(150),
        employmentType: optionalText(60),
        location: optionalText(150),
        summary: z.array(text(2000)).default([]),
        tags: z.array(text(60)).default([]),
      }),
    ),
  })
  .refine((e) => !e.endDate || e.endDate >= e.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
export type ExperienceInput = z.infer<typeof experienceInput>;
