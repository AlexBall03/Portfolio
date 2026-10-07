# Architecture — alexball.dev

A bilingual (English/Spanish) software-engineering portfolio, built as one full-stack Next.js application. This document describes the system as it exists after **Phase 1 (Architecture & Foundation)**.

## Stack

| Concern | Choice |
|---|---|
| Language / UI | TypeScript (strict), React 19 |
| Framework | Next.js 16, App Router, **Cache Components** (`'use cache'`), Partial Prefetching |
| Styling | Tailwind CSS v4 + the existing "Executive Engineer" design system (CSS layers) |
| Database | Neon Postgres via **Drizzle ORM** (`neon-http` driver), migrations by drizzle-kit |
| Validation | Zod 4 (env, external APIs, content inputs, contact form) |
| Email | Resend |
| Hosting | Vercel (Fluid Compute, Node runtime) |
| Tests | Vitest + PGlite (real Postgres, in-process) |
| Future auth | Clerk (Phase 3) — not installed yet |

## Request flow

```
request ─► src/proxy.ts ─► app/[locale]/… (Server Components)
              │                    │
   locale URL policy        features/*/queries.ts   ← cached ('use cache' + cacheTag)
   api.* → alexball.dev            │
                            features/*/repository.ts ← only code that touches the DB
                                   │
                              src/db (Drizzle) ─► Neon
```

Pages are thin compositions: resolve the locale, call cached query functions, render feature components. Nearly every route is **fully prerendered** and revalidated by time or by tag. The Projects page refreshes every 15 minutes because it includes live GitHub data.

## Directory layout

```
src/
  app/[locale]/           routes: home, about, projects, projects/[slug], experience, resume, contact,
                          not-found, error, [...rest] (404 catch-all); layout = root layout (html/body)
  app/                    sitemap.ts, robots.ts, manifest.ts, global-error.tsx
  proxy.ts                locale routing; future Clerk middleware goes here
  config/                 env.ts (Zod, server-only), site.ts (URLs, ids), navigation.ts (route structure)
  i18n/                   locales, typed UI dictionaries (en/es), path helpers, translation fallback
  db/                     client.ts, schema/*, migrations/ (committed SQL), seed/ (initial content), local.ts
  features/<domain>/      types.ts (domain types) · schema.ts (Zod inputs) · repository.ts (DB) ·
                          queries.ts (cached reads) · components/ (feature UI)
      projects  skills  experience  profile  site  github  contact
  integrations/           github/ (typed API client + Zod response schemas), resend/
  components/layout/      site chrome: SiteChrome (nav + drawer + palette), Footer, Pager, PageShell
  components/ui/          Icon, Reveal, SectionHead, CountUp, RelativeTime, LocalTime, JsonLd
  lib/                    logger, errors, media resolution, cache tags/lifetimes, seo/, validation, client/
  styles/                 globals.css (Tailwind + tokens), base.css, components/*.css
  test/                   PGlite test DB helper, server-only stub
```

**Dependency rules**
- `app/` → `features/*/queries` → `features/*/repository` → `db/`. UI never imports `db/` or `integrations/`.
- Repositories return **domain types** (`features/*/types.ts`), never Drizzle rows.
- `integrations/*` know nothing about UI or the domain model; they validate and normalize upstream data.
- Every server-only module imports `server-only`.
- Client Components are limited to interactive islands: nav/drawer/palette, theme and locale toggles, the contact form, the experience tabs, the role cycler, and the small `Reveal`/`CountUp`/`RelativeTime`/`LocalTime` primitives. Server children pass through client wrappers unchanged.

## Domain model (Neon)

All user-facing text lives in per-locale **translation tables** (`*_translations`, primary key `(entity, locale)`). Language-neutral facts (URLs, dates, ordering, technologies) are stored once, so English and Spanish can't drift apart again. If a translation is missing, reads fall back to English (`i18n/translations.ts`).

| Area | Tables |
|---|---|
| Projects | `projects` (slug, `status` draft/published/archived, featured, sort, live, links, published/archived timestamps) · `project_translations` · `project_slug_history` (retired slugs → 308) · `project_repositories` (0..n, provider + owner/name) · `project_technologies` · `project_media` |
| Skills | `technologies` (shared vocabulary) · `skill_categories` (`kind` stack/learning, icon, accent, status) · `skill_category_translations` · `skill_category_technologies` |
| Experience | `experiences` (career/education, real dates + precision, current) · `experience_translations` (role, type, location, summary[], tags[]) |
| Profile | `profile` (single row) · `profile_translations` (title, statement, about[], hero copy) · `social_links` · `profile_roles` · `profile_highlights` (differentiator/resume) · `snapshot_metrics` |
| Site | `site_settings` (single row: brand, GitHub username, feature switch, default theme) · `page_content` (per-page SEO copy) · `section_content` (section headings) |
| Media | `media_assets` (`storage` static/blob/external, src, dimensions) · `media_asset_translations` (alt text) |

**Lifecycle.** Public reads return only `published` (or `visible`) rows ordered by `sort_order`. Archiving is a soft delete that keeps history and slug redirects intact.
**Slugs.** `projects.slug` is the current public URL. When a slug changes, the old one goes into `project_slug_history`, and `/projects/<old>` answers with a permanent redirect.
**Media.** Consumers only ever see a resolved `MediaAsset` (`lib/media.ts`), so assets can move from `/public` to Vercel Blob or an external URL without touching the UI.

**What stays in code:** UI chrome strings (`i18n/dictionaries`), the route and navigation structure, the icon set, design tokens, and infrastructure configuration. Everything content-like is in the database, so a future Admin Configuration page can edit it.

## Data access

- `db/client.ts`: `getDb()` returns a Drizzle instance over Neon's **HTTP driver** (stateless, so there's no pool to exhaust on serverless). Phase 4 admin writes that need interactive transactions should add a `neon-serverless` Pool client for those paths only.
- `db/types.ts`: `Database` is driver-agnostic (`PgDatabase`), so repositories run identically on Neon, on PGlite in tests, and on the optional local dev DB.
- Caching: query functions use `'use cache'`, `cacheLife(CACHE_LIFE.content)`, and `cacheTag(CACHE_TAGS.x)` (`lib/cache-tags.ts`). **Admin mutations must call `updateTag(CACHE_TAGS.x)`** after a write.
- Migrations: edit `db/schema/*`, run `npm run db:generate`, and commit the SQL. Apply with `npm run db:migrate` (uses `DATABASE_URL_UNPOOLED`).
- Seed: `npm run db:seed` loads `db/seed/content.ts` (validated by `db/seed/schema.ts`) into an empty database in one transaction. It refuses to touch a database that already has content unless `--force` is passed. After bootstrap, **the database is the source of truth**.
- Local without Neon: `DATABASE_URL=pglite:.pglite` (persisted) or `pglite:memory://` gives you an in-process Postgres that is migrated and seeded automatically. It is refused on Vercel and excluded from deployment bundles.

## Localization

- URLs: English is unprefixed (`/about`), Spanish is prefixed (`/es/about`). `proxy.ts` rewrites unprefixed requests to `/en/...` internally, sends `/en/...` to the canonical URL with a 308, and redirects unprefixed URLs to `/es` when the `locale` cookie says so (set by the language toggle).
- UI strings: `i18n/dictionaries/en.ts`. `es.ts` is typed as `Dictionary`, so a missing Spanish key fails `tsc`.
- Content: translation tables with English fallback. Dates come from real values formatted with `Intl` (`features/experience/format.ts`).
- SEO: every page sets a canonical URL plus `hreflang` alternates for `en`, `es`, and `x-default`, and the sitemap lists both locales.

## Integrations

**GitHub** (`integrations/github` → `features/github`)
- The client validates every response with Zod and raises a typed `GithubError` (`rate-limited`, `not-found`, …).
- `getGithubOverview()` loads the profile, repositories, events, and contribution calendar **independently** (`Promise.allSettled`). Each part degrades on its own, and a degraded result is cached for only 60 seconds.
- Pure logic, unit-tested:
  - `calendar.ts` builds a week-aligned 26×7 grid anchored on GitHub's "today".
  - `events.ts` normalizes events into language-neutral records that the UI localizes.
  - `summarizeRepos` derives every stat from the same non-fork set.
- GitHub *enriches* the portfolio but never defines a project. Projects link to repositories through `project_repositories`.
- The username is a site setting (`site_settings.github_username`); only the token is an env var.

**Resend / contact** (`features/contact` → `integrations/resend`)
- One Zod schema (`contact/schema.ts`) validates in the browser for instant feedback and again in the Server Action, which is the trust boundary. Error messages are dictionary keys, so both sides render in the visitor's language.
- The Server Action works without JavaScript (`useActionState`). It also handles the honeypot, rejects header injection, HTML-escapes the email body, and sends the visitor's address as Reply-To (never From).
- Secrets and addresses are read only in `integrations/resend/client.ts` through `config/env.ts`.

**Observability.** `lib/logger.ts` writes one structured JSON line per event (`scope`, `level`). Integrations log their failures there. It's the single place to attach an error-reporting service later.

## Future insertion points

- **Clerk + `/admin` (Phase 3):**
  - Add `clerkMiddleware` in `proxy.ts`, scoped to `/admin`; `robots.ts` already disallows `/admin`.
  - Create `app/admin/` outside `[locale]`, plus `src/server/auth/` with an `authorize(user, permission)` check.
  - Add an `app_users` table keyed by the Clerk user ID for roles and preferences. Clerk owns identity and sessions; no credentials are stored in Postgres.
- **CMS (Phase 4):**
  - Add `features/*/mutations.ts` next to each `repository.ts`. Validate input with the existing `features/*/schema.ts` Zod schemas (the seed already uses them), then call `updateTag`.
  - The Configuration page edits `profile`, `social_links`, `profile_roles`, `profile_highlights`, `snapshot_metrics`, `page_content`, `section_content`, and `site_settings`.
- **Public API:** `app/api/v1/*` route handlers calling the same `queries.ts` and mapping domain types to versioned DTOs. Nothing in the domain layer depends on HTTP.
- **SDLC Manager (Phase 6):**
  - Sync goes through the domain mutations, never straight to tables or UI.
  - Store external links and synced fields in a dedicated table (e.g. `project_sources`: project id, source, external id, synced-at).
  - Portfolio-owned fields (status, featured, order, media, translations) stay authoritative and are never overwritten by sync.

## Conventions

- Feature-first folders. Add a domain by copying the `types / schema / repository / queries / components` shape, and only the parts you need.
- No `any`. Casts only where a library boundary requires one, with a comment.
- Server Components by default. A Client Component needs a concrete interactive reason.
- Never render `Date.now()` or `new Date()` into cached server output. Use the client time components (`RelativeTime`, `LocalTime`).
- Scroll reveals render state through React (`useInView`). Never mutate React-owned DOM from outside React.
- Commands: `npm run check` (typecheck + lint + tests) before committing. `npm run build` needs a `DATABASE_URL`; `pglite:memory://` works locally.

## Replaced in Phase 1

- **Vite SPA, React Router, and the client-only context.** Replaced by the Next.js App Router with Server Components and the Metadata API. Pages are now server-rendered and indexable in both languages.
- **`siteData.js` / `siteStrings.js`** (content duplicated per language). Replaced by the Neon domain model plus typed UI dictionaries.
- **`api/github.js`, `api/contact.js`, the CORS allowlist, `VITE_API_BASE_URL`, and the `api.alexball.dev` API portal.** Replaced by in-process cached services and a Server Action. The subdomain now redirects to the main site.
- **The `scrollWatcher` singleton and `window.__animReady` global.** Replaced by one shared IntersectionObserver hook.
- **Build-time JSON-LD injection and runtime `<head>` mutation.** Replaced by server-rendered metadata and JSON-LD.
- **The static `sitemap.xml`, `robots.txt`, and `site.webmanifest`.** Replaced by generated `app/sitemap.ts`, `app/robots.ts`, and `app/manifest.ts`.
