/**
 * What every admin Server Action returns. Errors are data, not exceptions, so
 * a form can render them; authorization failures are the exception (they end
 * the request as a 404 before any of this runs).
 */
export type MutationResult<T> =
  | { ok: true; data: T; savedAt: string }
  | {
      ok: false;
      /** Messages keyed by the input path, e.g. `title` or `items.2.icon`. */
      fieldErrors: Record<string, string>;
      /** A message for the form as a whole. */
      formError?: string;
    };

export type FieldErrors = Record<string, string>;
