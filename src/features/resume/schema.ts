import { z } from 'zod';

/** Resume editor inputs. The file itself is checked by the service, from its bytes. */

const versionId = z.uuid('Unknown resume version');

const label = z
  .string()
  .trim()
  .max(120, 'Keep the label under 120 characters')
  .transform((v) => (v === '' ? null : v));

export const resumeVersionInput = z.object({ id: versionId });
export type ResumeVersionInput = z.infer<typeof resumeVersionInput>;

export const resumeLabelInput = z.object({ id: versionId, label });
export type ResumeLabelInput = z.infer<typeof resumeLabelInput>;

export const resumeUploadMetaInput = z.object({ label });
export type ResumeUploadMetaInput = z.infer<typeof resumeUploadMetaInput>;
