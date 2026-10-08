import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import type { z } from 'zod';
import { FieldValidationError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { FieldErrors, MutationResult } from './result';

const log = createLogger('cms');

/** Zod issues as one message per input path (the first issue wins). */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join('.');
    out[path] ??= issue.message;
  }
  return out;
}

/**
 * Steps 2–4 of an admin mutation: validate, write, report. Authorization
 * (step 1) stays in each Server Action so `requireAdmin()` is visible, and
 * checked, at every entry point:
 *
 *   export async function saveThing(input: unknown) {
 *     'use server';
 *     const admin = await requireAdmin();
 *     return runMutation(thingInput, input, async (data) => {
 *       const saved = await service.saveThing(data, admin);
 *       updateTag(CACHE_TAGS.thing);
 *       return saved;
 *     });
 *   }
 *
 * A service's `FieldValidationError` becomes field errors and a `NotFoundError`
 * a form error. Unexpected failures are logged and reported generically;
 * nothing internal reaches the browser.
 */
export async function runMutation<S extends z.ZodType, R>(
  schema: S,
  input: unknown,
  write: (data: z.output<S>) => Promise<R>,
): Promise<MutationResult<R>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), formError: 'Some fields need attention.' };
  }
  try {
    const data = await write(parsed.data);
    return { ok: true, data, savedAt: new Date().toISOString() };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof FieldValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors, formError: 'Some fields need attention.' };
    }
    if (err instanceof NotFoundError) {
      return { ok: false, fieldErrors: {}, formError: 'This item no longer exists. Reload the page.' };
    }
    log.error('Admin mutation failed', err);
    return { ok: false, fieldErrors: {}, formError: 'Saving failed. Nothing was changed; try again.' };
  }
}
