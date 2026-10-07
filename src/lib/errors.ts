/** Required content is missing from the database (usually: not seeded yet). */
export class ContentMissingError extends Error {
  override name = 'ContentMissingError';
  constructor(what: string) {
    super(`${what} is missing from the database. Run \`npm run db:migrate && npm run db:seed\`.`);
  }
}
