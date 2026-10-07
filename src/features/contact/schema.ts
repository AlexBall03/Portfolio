import { z } from 'zod';
import type { Dictionary } from '@/i18n/get-dictionary';

/**
 * Contact form contract, shared by the browser (instant feedback) and the
 * Server Action (the actual trust boundary). Error messages are dictionary
 * keys, so both sides render the visitor's language.
 */
export type ContactErrorKey = keyof Dictionary['contact']['errors'];

const err = (key: ContactErrorKey) => ({ error: key });

// Caps: 254 is the RFC 5321 maximum for an address; the others are product limits.
export const CONTACT_LIMITS = { name: 100, email: 254, subject: 150, message: 5000 } as const;

export const contactSchema = z.object({
  name: z.string(err('nameRequired')).trim().min(1, err('nameRequired')).max(CONTACT_LIMITS.name, err('tooLong')),
  email: z
    .string(err('emailRequired'))
    .trim()
    .min(1, err('emailRequired'))
    .max(CONTACT_LIMITS.email, err('tooLong'))
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, err('emailInvalid')),
  // The subject becomes part of a real email header, so line breaks are rejected
  // rather than stripped — a caller must not be able to inject headers.
  subject: z
    .string(err('subjectRequired'))
    .trim()
    .min(1, err('subjectRequired'))
    .max(CONTACT_LIMITS.subject, err('tooLong'))
    .refine((s) => !/[\r\n]/.test(s), err('subjectInvalid')),
  message: z
    .string(err('messageRequired'))
    .trim()
    .min(1, err('messageRequired'))
    .max(CONTACT_LIMITS.message, err('tooLong')),
});

export type ContactMessage = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactMessage;
export type FieldErrors = Partial<Record<ContactField, ContactErrorKey>>;

/** Hidden field; humans never fill it, so any value marks the submission as automated. */
export const HONEYPOT_FIELD = 'company';

export function validateContact(input: unknown):
  | { ok: true; data: ContactMessage }
  | { ok: false; errors: FieldErrors } {
  const parsed = contactSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as ContactField;
    errors[field] ??= issue.message as ContactErrorKey;
  }
  return { ok: false, errors };
}

/** Raw field values echoed back so a rejected submission keeps what was typed. */
export type ContactValues = Record<ContactField, string>;

export type ContactState =
  | { status: 'idle' }
  | { status: 'invalid'; errors: FieldErrors; values: ContactValues }
  | { status: 'error'; error: 'send' | 'unavailable'; values: ContactValues }
  | { status: 'sent'; name: string };
