# Alexander D. Ball — Portfolio

> Personal portfolio and engineering showcase · **[alexball.dev](https://alexball.dev)**

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white&style=flat-square)
![Neon](https://img.shields.io/badge/Neon-Postgres-00E599?logo=postgresql&logoColor=white&style=flat-square)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white&style=flat-square)

An English-language portfolio built as a full-stack Next.js application. Pages are server-rendered from content modeled in Neon Postgres, live GitHub activity comes through a cached integration, and the contact form delivers through Resend.

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for how it's built and where things go.

## Features

- **Six routed pages plus project pages:** Home, About, Projects (`/projects/<slug>`), Experience, Resume, Contact.
- **Database-backed content:** projects, skills, experience, profile, socials, and page copy, with draft/published/archived lifecycle and ordering, ready for a future admin.
- **Live GitHub section:** a week-aligned contribution heatmap, repositories, stats, and recent activity, cached for 15 minutes and degrading gracefully.
- **Contact form:** validated in the browser and again on the server, works without JavaScript, has a honeypot, and delivers through Resend.
- **Command palette:** `⌘K` / `Ctrl K` to jump to pages, download the resume, copy the email address, or switch theme.
- **Dark and light themes** with no flash on load; respects reduced-motion settings.
- **Private admin:** `/admin`, a Clerk-authenticated console for the single site owner (no public sign-up).
- **SEO:** per-page metadata, canonical URLs, Open Graph, a generated sitemap and robots.txt, and server-rendered Schema.org JSON-LD.

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in what you have
npm run dev
```

You don't need a Neon account for local work. Set `DATABASE_URL=pglite:.pglite` in `.env.local` to use an in-process Postgres that is migrated and seeded automatically.

With Neon, put the **`dev` branch's** two connection strings in `.env.local` (never Production's). There is no migrate or seed step: `npm run dev` first applies any pending migrations to that database and loads the initial content if it is new, and every deployment does the same for its own database.

## Admin & authentication

`/admin` is the site's private control room, linked discreetly as **Admin** in the footer. It is a small CMS: every piece of public content has one editor there (projects with drafts, order, and images; skills; experience; resume versions; profile; social links; contact copy; page copy; site configuration), plus a status dashboard. Each piece of content is written once, in English.

- **Clerk** handles sign-in (email + password, GitHub, Google). **The site** decides who is admin: exactly one Clerk user, identified by `ADMIN_CLERK_USER_ID`. Authentication alone grants nothing.
- **There is no sign-up.** The single admin account is created by hand in Clerk, and the Clerk instance is set to *Invite-only*, so nobody can register.
- Authorization is enforced on the server at every layer: the proxy, the console layout, and each admin page, Server Action, and Route Handler (`requireAdmin()` / `adminRoute()` in `src/server/auth`). Anyone who isn't the admin gets a 404.
- Without the three Clerk variables the admin is simply switched off; the rest of the site is unaffected.

Setup for local, Preview, and Production (Clerk Development vs Production instances, different user IDs): **[docs/admin-setup.md](docs/admin-setup.md)**. Architecture: [ARCHITECTURE.md](ARCHITECTURE.md#authentication--admin).

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

All variables are validated in `src/config/env.ts` and are server-only, except Clerk's publishable key, which is public by design.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon pooled connection string (or `pglite:…` locally) |
| `DATABASE_URL_UNPOOLED` | for `db:*` and deployments | Neon direct connection string to the same database |
| `GITHUB_TOKEN` | for GitHub data | Fine-grained personal access token with **Public repositories (read-only)** access, for the GitHub REST/GraphQL APIs (the global section and project analytics). The app only ever shows public repositories, whatever the token can see |
| `RESEND_API_KEY` | for contact form | Resend API key |
| `CONTACT_TO_EMAIL` | no | Recipient (default `contact@alexball.dev`) |
| `CONTACT_FROM_EMAIL` | no | Sender on a Resend-verified domain (default `contact@alexball.dev`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | for `/admin` | Clerk publishable key (`pk_test_…` locally/Preview, `pk_live_…` Production) |
| `CLERK_SECRET_KEY` | for `/admin` | Clerk secret key from the same instance |
| `ADMIN_CLERK_USER_ID` | for `/admin` | The admin's Clerk user ID (`user_…`) in that instance |
| `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` | for project images | The **public** Vercel Blob store (set by connecting it) |
| `PRIVATE_BLOB_READ_WRITE_TOKEN` or `PRIVATE_BLOB_STORE_ID` | for resumes | The **private** Vercel Blob store, connected with the env prefix `PRIVATE_BLOB` |

If `GITHUB_TOKEN`, `RESEND_API_KEY`, or a Blob store is missing, only that feature degrades (no resume is served until the private store exists and a version is published). Without the Clerk variables, `/admin` is switched off. The rest of the site works either way.

Who sets what: the Neon integration provides both database variables in Vercel Production and Preview. `GITHUB_TOKEN`, `RESEND_API_KEY`, and the optional contact addresses are added by hand in Vercel for both environments. The Clerk variables are added by hand per environment: Development-instance values for Preview, Production-instance values for Production. Locally, everything comes from `.env.local`.

## Deployment

Vercel deploys `master` to production. `dev` is the working branch.

Each deployment prepares its own database before building: Production uses Neon `main`, each Preview deployment gets its own Neon branch copied from `main`, and local development uses Neon `dev`. The database is selected only by environment variables. Pending migrations are applied and a brand-new database receives its initial content; existing content is never modified. Details are in [ARCHITECTURE.md](ARCHITECTURE.md#database-lifecycle).

## Assets

Icons and the social card live in `public/`. The resume is not a static file: versions are uploaded in `/admin/resume` (private Vercel Blob) and the published one is served at `/resume.pdf`. To regenerate the icon set:

```bash
powershell -File scripts/generate-icons.ps1
node scripts/make-ico.mjs
powershell -File scripts/generate-og.ps1
```

## License

MIT
