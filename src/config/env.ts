import 'server-only';
import { z } from 'zod';

/**
 * Server environment, validated lazily per concern so that a missing optional
 * integration (e.g. GitHub) degrades that feature instead of crashing the app.
 * Nothing here is ever exposed to the client — there are no NEXT_PUBLIC_ vars.
 */

const nonEmpty = z.string().trim().min(1);

const databaseSchema = z.object({ DATABASE_URL: nonEmpty });
const githubSchema = z.object({ GITHUB_TOKEN: nonEmpty });
const contactSchema = z.object({
  RESEND_API_KEY: nonEmpty,
  CONTACT_TO_EMAIL: z.email().default('contact@alexball.dev'),
  CONTACT_FROM_EMAIL: z.email().default('contact@alexball.dev'),
});

export class ConfigError extends Error {
  override name = 'ConfigError';
}

function read<T extends z.ZodType>(schema: T, concern: string): z.infer<T> {
  // Empty strings in .env files mean "unset", so defaults apply.
  const source = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''),
  );
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new ConfigError(`Missing or invalid ${concern} environment variable(s): ${keys}`);
  }
  return parsed.data;
}

export const databaseEnv = () => {
  try {
    return read(databaseSchema, 'database');
  } catch (err) {
    throw new ConfigError(
      `${(err as Error).message}. Add your Neon connection string to .env.local, ` +
        'or use DATABASE_URL=pglite:.pglite for a local database with no setup.',
    );
  }
};
export const githubEnv = () => read(githubSchema, 'GitHub');
export const contactEnv = () => read(contactSchema, 'contact');
