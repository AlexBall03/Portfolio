# Alexander D. Ball — Portfolio

> Personal portfolio and engineering showcase · **[alexball.dev](https://alexball.dev)**

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white&style=flat-square)
![Neon](https://img.shields.io/badge/Neon-Postgres-00E599?logo=postgresql&logoColor=white&style=flat-square)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white&style=flat-square)

A bilingual (English/Spanish) portfolio built as a full-stack Next.js application. Pages are server-rendered from content modeled in Neon Postgres, live GitHub activity comes through a cached integration, and the contact form delivers through Resend.

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for how it's built and where things go.

## Features

- **Six routed pages plus project pages:** Home, About, Projects (`/projects/<slug>`), Experience, Resume, Contact.
- **English and Spanish:** Spanish lives under `/es`, both versions are server-rendered with hreflang alternates, and the site remembers your language choice.
- **Database-backed content:** projects, skills, experience, profile, socials, and page copy, with draft/published/archived lifecycle and ordering, ready for a future admin.
- **Live GitHub section:** a week-aligned contribution heatmap, repositories, stats, and localized recent activity, cached for 15 minutes and degrading gracefully.
- **Contact form:** validated in the browser and again on the server, works without JavaScript, has a honeypot, and delivers through Resend.
- **Command palette:** `⌘K` / `Ctrl K` to jump to pages, download the resume, copy the email address, or switch theme and language.
- **Dark and light themes** with no flash on load; respects reduced-motion settings.
- **SEO:** per-page metadata, canonical URLs, Open Graph, a generated sitemap and robots.txt, and server-rendered Schema.org JSON-LD.

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in what you have
npm run dev
```

You don't need a Neon account for local work. Set `DATABASE_URL=pglite:.pglite` in `.env.local` to use an in-process Postgres that is migrated and seeded automatically.

With Neon, put the **preview branch's** two connection strings in `.env.local` (never Production's). There is no migrate or seed step: `npm run dev` first applies any pending migrations to that database and loads the initial content if it is new, and every deployment does the same for its own database.

## Scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `start` | Next.js. `dev` runs `db:prepare` first |
| `check` | Type check + lint + tests |
| `typecheck` · `lint` · `test` | Individually |
| `db:generate` | Generate a migration from `src/db/schema` changes |
| `build:deploy` | What Vercel runs: `db:prepare`, then `next build` |
| `db:prepare` | Apply pending migrations, then bootstrap content if the database is new. Safe to repeat |
| `db:migrate` | Apply pending migrations only |
| `db:seed` | Bootstrap content only. `-- --force` wipes and reloads content: disposable databases only, never Production |
| `db:studio` | Drizzle Studio |

## Environment variables

All variables are server-only and validated in `src/config/env.ts`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon pooled connection string (or `pglite:…` locally) |
| `DATABASE_URL_UNPOOLED` | for `db:*` and deployments | Neon direct connection string to the same database |
| `GITHUB_TOKEN` | for GitHub section | Read-only token for the GitHub REST/GraphQL APIs |
| `RESEND_API_KEY` | for contact form | Resend API key |
| `CONTACT_TO_EMAIL` | no | Recipient (default `contact@alexball.dev`) |
| `CONTACT_FROM_EMAIL` | no | Sender on a Resend-verified domain (default `contact@alexball.dev`) |

If `GITHUB_TOKEN` or `RESEND_API_KEY` is missing, only that feature degrades; the rest of the site still works.

## Deployment

Vercel deploys `master` to production. `dev` is the working branch.

Each deployment prepares its own database before building: Production uses Neon `main`, Preview uses the Neon preview branch, selected only by the environment variables Vercel provides. Pending migrations are applied and a brand-new database receives its initial content; existing content is never modified. Details are in [ARCHITECTURE.md](ARCHITECTURE.md#database-lifecycle).

## Assets

Icons, the social card, and the resume live in `public/`. To regenerate the icon set:

```bash
powershell -File scripts/generate-icons.ps1
node scripts/make-ico.mjs
powershell -File scripts/generate-og.ps1
```

## License

MIT
