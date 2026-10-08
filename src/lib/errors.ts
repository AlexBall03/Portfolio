/** Required content is missing from the database (usually: not seeded yet). */
export class ContentMissingError extends Error {
  override name = 'ContentMissingError';
  constructor(what: string) {
    super(`${what} is missing from the database. Run \`npm run db:migrate && npm run db:seed\`.`);
  }
}

/**
 * Input that is well-formed but breaks a rule only the database can check
 * (e.g. a slug already in use). Thrown by domain services; `runMutation`
 * reports it as field errors, exactly like a schema failure.
 */
export class FieldValidationError extends Error {
  override name = 'FieldValidationError';
  constructor(readonly fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors).join('; '));
  }
}

/** A referenced entity does not exist (or does not belong where the caller says). */
export class NotFoundError extends Error {
  override name = 'NotFoundError';
  constructor(what: string) {
    super(`${what} was not found`);
  }
}
