# Architecture — alexball.dev

A bilingual (English/Spanish) software-engineering portfolio, built as one full-stack Next.js application. This document describes the system as it exists after **Phase 4B (Project Management & Media)**: Phase 1 laid the architecture, Phase 2 the design system, Phase 3 the private `/admin`, Phase 4A the first write paths (Profile and Configuration editors) plus the conventions the remaining editors follow, and Phase 4B the Projects editor with its publication workflow, ordering, and Vercel Blob images (see **Content management**).

## Stack

| Concern | Choice |
|---|---|
| Language / UI | TypeScript (strict), React 19 |
| Framework | Next.js 16, App Router, **Cache Components** (`'use cache'`), Partial Prefetching |
| Styling | Tailwind CSS v4 utilities over a semantic OKLCH token design system (see **Design system**) |
| Database | Neon Postgres via **Drizzle ORM** (`neon-http` driver), migrations by drizzle-kit |
| Media storage | Vercel Blob (public store) for uploaded images; metadata in Postgres |
| Validation | Zod 4 (env, external APIs, content inputs, contact form) |
| Email | Resend |
| Hosting | Vercel (Fluid Compute, Node runtime) |
| Tests | Vitest + PGlite (real Postgres, in-process) |
| Auth | Clerk (`@clerk/nextjs`) for identity on `/admin` only; authorization is the app's own (single admin, see **Authentication & admin**) |

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

Admin requests (`/admin`, `/api/admin`) take a separate branch in `proxy.ts`: no locale handling, and Clerk resolves the session before the first authorization check (see **Authentication & admin**).

Pages are thin compositions: resolve the locale, call cached query functions, render feature components. Nearly every route is **fully prerendered** and revalidated by time or by tag. The Projects page refreshes every 15 minutes because it includes live GitHub data.

## Directory layout

```
src/
  app/[locale]/           routes: home, about, projects, projects/[slug], experience, resume, contact,
                          not-found, error, [...rest] (404 catch-all); layout = root layout (html/body)
  app/admin/              the private admin (English-only, its own root layout): sign-in/[[...sign-in]],
                          (console)/ (guarded layout, dashboard, profile/{,roles,highlights,metrics},
                          configuration, projects/{,new,order,[id]/{,media,preview}}, [...rest] 404), not-found, error
  app/api/admin/          admin Route Handlers (session: the reference handler; projects/[id]/media{,/[assetId]}: image uploads)
  app/                    sitemap.ts, robots.ts, manifest.ts, global-error.tsx
  proxy.ts                locale routing (public) + Clerk and the admin gate (admin, Server Actions)
  server/auth/            admin authorization: policy (the rule), gate (proxy decision), admin (requireAdmin…), route (adminRoute)
  config/                 env.ts (Zod, server-only), site.ts (URLs, ids), navigation.ts (route structure),
                          admin.ts (admin paths + console navigation)
  i18n/                   locales, typed UI dictionaries (en/es), path helpers, translation fallback
  db/                     client.ts (app, HTTP), schema/*, migrations/ (committed SQL), seed/ (initial content),
                          prepare.ts (migrate + bootstrap), admin/ (tooling target + direct connection),
                          cli/ (db:* scripts and their .env.local loader; never imported by the app), local.ts
  features/<domain>/      types.ts (domain types) · schema.ts (Zod inputs) · repository.ts (DB) ·
                          queries.ts (cached reads) · components/ (feature UI)
                          admin-managed domains add: service.ts (editor loads + transactional saves) ·
                          mutations.ts (Server Actions) · components/admin/ (editor islands) · upload.ts (projects: upload request plumbing)
      projects  skills  experience  profile  site  github  contact  admin (dashboard facts)
  integrations/           github/ (typed API client + Zod response schemas), resend/, blob/ (MediaStore over Vercel Blob)
  components/layout/      site chrome: SiteChrome (command bar + drawer + palette), Preferences, Footer, Pager, PageShell, Screen
  components/admin/       console UI: AdminShell, AdminNav, AdminTopBar (bar + drawer), AccountActions, AdminPageHeader, AdminLoading,
                          AdminUnavailable, SectionTabs, ConfirmDialog, clerk-appearance (Clerk themed with the tokens)
  components/admin/form/  editor primitives: useEditor, EditorForm (+ save bar), EditorSection, fields, LocaleTabs, RepeatableList,
                          SortableList (drag + move buttons), ImageUploadField (+ checkImageFile, sendUpload)
  components/ui/          design-system primitives (Container, Section, SectionHeader, Eyebrow, Prose, Stat, Status,
                          Tag, Surface, SystemState, buttonStyles) + Icon, Reveal, CountUp, RelativeTime, LocalTime, JsonLd
  lib/                    logger, errors (incl. FieldValidationError, NotFoundError), media resolution, image-file (byte sniffing),
                          cache tags/lifetimes, seo/, validation, client/ (incl. history-guard),
                          cms/ (mutation result + runner, locale status, write conventions, form value helpers)
  styles/                 tokens.css (semantic roles per theme), globals.css (Tailwind theme), base.css, system.css
  test/                   PGlite test DB helper, server-only stub
```

**Dependency rules**
- `app/` → `features/*/queries` → `features/*/repository` → `db/`. UI never imports `db/` or `integrations/`.
- Repositories return **domain types** (`features/*/types.ts`), never Drizzle rows.
- `integrations/*` know nothing about UI or the domain model; they validate and normalize upstream data.
- Every server-only module imports `server-only`.
- Client Components are limited to interactive islands: nav/drawer/palette, theme and locale toggles, the contact form, the experience tabs, the role cycler, and the small `Reveal`/`CountUp`/`RelativeTime`/`LocalTime` primitives. In the admin: the nav (active state), the mobile drawer, the account actions, Clerk's own sign-in, and the editors (`features/*/components/admin`). Server children pass through client wrappers unchanged.
- Nothing public imports Clerk or `server/auth`; the public site has no auth-aware components. The one feature file allowed the guard is `features/*/mutations.ts`. Public routes and chrome never import mutations, services, or admin UI, and client modules reach the server only through Server Actions (all enforced by `server/auth/boundaries.test.ts`).

## Domain model (Neon)

All user-facing text lives in per-locale **translation tables** (`*_translations`, primary key `(entity, locale)`). Language-neutral facts (URLs, dates, ordering, technologies) are stored once, so English and Spanish can't drift apart again. If a translation is missing, reads fall back to English (`i18n/translations.ts`).

| Area | Tables |
|---|---|
| Projects | `projects` (slug, `status` draft/published/archived, featured, sort, live, links, published/archived timestamps) · `project_translations` (name, tagline, summary, `body` paragraphs) · `project_slug_history` (retired slugs → 308) · `project_repositories` (0..n, provider + owner/name) · `project_technologies` · `project_media` (role cover/gallery; at most one cover per project) |
| Skills | `technologies` (shared vocabulary) · `skill_categories` (`kind` stack/learning, icon, accent, status) · `skill_category_translations` · `skill_category_technologies` |
| Experience | `experiences` (career/education, real dates + precision, current) · `experience_translations` (role, type, location, summary[], tags[]) |
| Profile | `profile` (single row) · `profile_translations` (title, statement, about[], hero copy) · `social_links` · `profile_roles` · `profile_highlights` (differentiator/resume) · `snapshot_metrics` (`source` static/published_projects/technologies: derived values are counted from published content at read time) |
| Site | `site_settings` (single row: brand, GitHub username, feature switch, default theme) · `page_content` (per-page SEO copy) · `section_content` (section headings) |
| Media | `media_assets` (`storage` static/blob/external, src, MIME type, dimensions) · `media_asset_translations` (alt text, optional caption) |
| System | `content_bootstrap` (single row: this database has received its initial content) |

**Authorship.** Admin-managed tables carry nullable `created_by` / `updated_by` (the admin's Clerk user ID, from `requireAdmin()`; `authorship` in `db/schema/_shared.ts`). So far: `profile`, `profile_roles`, `profile_highlights`, `snapshot_metrics`, `site_settings`, `projects`, `media_assets`. Each later editor adds them to its own tables in the same change. Seeded rows have null.

**Lifecycle.** Public reads return only `published` (or `visible`) rows ordered by `sort_order`. Archiving is a soft delete that keeps history and slug redirects intact.
**Slugs.** `projects.slug` is the current public URL. When a slug changes, the old one goes into `project_slug_history`, and `/projects/<old>` answers with a permanent redirect.
**Media.** Consumers only ever see a resolved `MediaAsset` (`lib/media.ts`), so assets can move from `/public` to Vercel Blob or an external URL without touching the UI.

**What stays in code:** UI chrome strings (`i18n/dictionaries`), the route and navigation structure, the icon set, design tokens, and infrastructure configuration. Everything content-like is in the database, so a future Admin Configuration page can edit it.

## Data access

- `db/client.ts`: `getDb()` returns a Drizzle instance over Neon's **HTTP driver** (stateless, so there's no pool to exhaust on serverless). `withTransaction(run)` is for admin writes that must be atomic: on Neon it opens a `neon-serverless` WebSocket Pool for that one transaction and closes it; on PGlite it uses the shared instance. Reads never use it.
- `db/types.ts`: `Database` is driver-agnostic (`PgDatabase`), so repositories run identically on Neon, on PGlite in tests, and on the optional local dev DB.
- Caching: query functions use `'use cache'`, `cacheLife(CACHE_LIFE.content)`, and `cacheTag(CACHE_TAGS.x)` (`lib/cache-tags.ts`). **Admin mutations must call `updateTag(CACHE_TAGS.x)`** after a write.
- Migrations: edit `db/schema/*`, run `npm run db:generate`, and commit the SQL. Deployments apply it; see **Database lifecycle** below.
- Seed: `db/seed/content.ts` (validated by `db/seed/schema.ts`) is the initial content for a brand-new database. After bootstrap, **the database is the source of truth**.
- Local without Neon: `DATABASE_URL=pglite:.pglite` (persisted) or `pglite:memory://` gives you an in-process Postgres that is prepared automatically on connect. It is refused on Vercel and excluded from deployment bundles.

## Database lifecycle

Every Vercel deployment runs `npm run build:deploy` (set in `vercel.json`), which is `db:prepare` followed by `next build`. The schema and initial content therefore exist before Next.js prerenders anything from the database. A failure in `db:prepare` fails the deployment.

```
Vercel env (Preview or Production) ─► db:prepare ─► next build
                                        1. take a session advisory lock
                                        2. apply pending committed migrations
                                        3. check that no committed migration was skipped
                                        4. bootstrap initial content if the database has never had any
```

**Which database.** Nothing in the code names a Neon branch; the environment variables alone select it.

| Where | Database | Who sets the variables |
|---|---|---|
| Vercel Production | Neon `main` (persistent) | Neon integration |
| Vercel Preview | a Neon branch created from `main` for that deployment | Neon integration ("Create database branch for deployment", Preview only) |
| Local | Neon `dev` (persistent, branched from `main`) | you, in `.env.local` |

The integration sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). `db:prepare` prints `target <host>/<database>` (no credentials) at the top of the build log; Vercel may redact the host there because the integration also stores it as a sensitive variable.

**Pooled vs direct.**

| Variable | Used by | Why |
|---|---|---|
| `DATABASE_URL` (pooled) | the app, at build and at runtime (`db/client.ts`, Neon HTTP driver) | stateless queries from serverless functions |
| `DATABASE_URL_UNPOOLED` (direct) | `db:prepare`, `db:migrate`, `db:seed`, `db:studio` (`db/admin/`) | DDL, interactive transactions, and a session advisory lock, none of which are reliable through PgBouncer |

`db/admin/env.ts` refuses to run if the two variables name different databases, or if only a pooled URL is available. It falls back to `DATABASE_URL` only when that is itself a direct connection.

**Environment precedence** for database tooling, highest first:

1. Variables already in the process environment (Vercel, CI, your shell).
2. `.env.local`, read **only when neither `VERCEL` nor `CI` is set**, and never overriding a variable that is already set.

So a deployment can only reach the database Vercel selected for it. `.env.local` is also gitignored and never part of a deployment. Locally, `npm run dev` prepares the database `.env.local` points at; `npm run build` is plain `next build` and only reads it.

The scripts load `.env.local` through `db/cli/local-env.ts`. That file is script-only (an ESLint rule keeps `db/cli` out of `src/` imports): the app gets `.env.local` from Next.js, and filesystem access in app-reachable code makes Turbopack trace the whole project.

**Migrations.** Only committed SQL in `db/migrations` is applied, through Drizzle's migrator and its ledger (`drizzle.__drizzle_migrations`). Nothing is generated or pushed at deploy time. With nothing pending the step is a no-op. The advisory lock serializes concurrent deployments against the same database.

- Migrations run *before* the new build goes live, while the previous deployment is still serving. Keep them backward compatible: add first, remove in a later release.
- Drizzle applies only migrations newer than the last one recorded. If a merge leaves a migration with an older timestamp, `db:prepare` fails and says so; regenerate that migration.
- Each Preview deployment migrates its own branch, so feature branches cannot collide. A Preview branch is a copy of `main`, so it already holds content and the bootstrap marker; only pending migrations are applied.

**Bootstrap.** `seedContent` loads `db/seed/content.ts` exactly once per database. The decision is recorded in the single-row `content_bootstrap` table rather than inferred from content:

| State | Result |
|---|---|
| marker row exists | `skipped`, nothing written |
| no marker, any content table has rows | `adopted`: the marker is recorded, no content written |
| no marker, every content table empty | `seeded`: marker and content written in one transaction |

Claiming the marker row is what makes concurrent runs safe. Because the marker outlives the content, anything edited or deleted later (by hand now, through `/admin` from Phase 4) is never restored by a deployment.

- The seed is for new databases only. Rows an *existing* database needs after a schema change belong in a migration (`drizzle-kit generate --custom`).
- `npm run db:seed -- --force` truncates every content table and reloads the seed. It is refused when `VERCEL` or `CI` is set. Use it only on a database you are willing to lose; never on Production.

**Local development.** `.env.local` holds the two URLs of the Neon `dev` branch, so nothing done locally reaches Production or a Preview. `npm run dev` runs `db:prepare` first (`predev`), so a new migration is applied the next time the dev server starts. Production's URLs do not belong in `.env.local`: `main` is reached only by Production deployments. Without a `DATABASE_URL` the app refuses to start; there is no fallback database.

**New environment.** Point the Vercel environment (or `.env.local`) at the empty database and deploy (or start the dev server). No manual migrate or seed step.

**Never** run `drizzle-kit push`, `db:seed -- --force`, or hand-written `DROP`/`TRUNCATE` against Production, and never edit a migration that has already been applied anywhere.

## Authentication & admin

**Responsibilities.** Clerk owns identity: accounts, credentials, OAuth (GitHub, Google), sessions, MFA, and account management. The application owns authorization: a Clerk identity administers alexball.dev only if its stable user ID equals `ADMIN_CLERK_USER_ID`. Never by name or email.

**One administrator.** There are no roles, permissions, organizations, invitations, or user tables. The admin account is created by hand in Clerk, whose instance is set to *Invite-only* access mode. The site has no sign-up route, and Clerk's sign-up prompt is hidden (both checked in `boundaries.test.ts`). Clerk's Development and Production instances have different users, so each environment configures its own ID. Setup: [docs/admin-setup.md](docs/admin-setup.md).

**Single source of truth: `src/server/auth/`.**

| Module | What it is |
|---|---|
| `policy.ts` | `isAdminUserId(userId, adminUserId)`: the rule. Pure; missing values fail closed |
| `admin.ts` (server-only) | `getAuthorization()` → `unconfigured` / `signed-out` / `forbidden` / `admin`, resolved once per request at request time (`connection()`). `requireAdmin()` returns `{ userId }` or ends the request as a 404. Also `isAdmin()` and `getAdminProfile()` (display only) |
| `route.ts` (server-only) | `adminRoute(handler)` for `app/api/admin/*`: a 404 JSON for anyone else, `no-store` responses |
| `gate.ts` | `adminGate()`: the proxy's decision, pure and unit-tested |

**Defense in depth.** Each layer re-checks on its own; none trusts an earlier one.

1. **Proxy** (`proxy.ts`). For `/admin*` and `/api/admin*`, `clerkMiddleware` resolves the session, then `adminGate` decides:
   - signed out (including an invalid or expired session) → page: 307 to `/admin/sign-in?redirect_url=…`; API: 404
   - signed in as anyone else → rewritten to the public 404 (real 404 status), indistinguishable from a URL that doesn't exist
   - the admin → through
   - `/admin/sign-in` → always through
2. **Console layout** (`app/admin/(console)/layout.tsx`). `requireAdmin()` runs inside `<Suspense>` (Cache Components); the shell and page render only after it succeeds, so nothing protected can flash first.
3. **Every resource.** Each console page, Server Action, and Route Handler calls `requireAdmin()` / `adminRoute()` itself. `boundaries.test.ts` fails if a console page, an admin Route Handler, or a `'use server'` module in `app/admin` or a `mutations.ts` file doesn't. `features/profile/admin.test.ts` checks that every Server Action rejects a signed-out or non-admin caller as a 404 before validating, writing, or invalidating anything.

**Why layer 3 is not optional.** Server Action IDs are global: an action defined for `/admin` can be POSTed to *any* path, including public pages the admin layout never sees. So the proxy also runs Clerk for every Server Action request (`next-action` header). That lets an action's own `requireAdmin()` resolve the session and reject cleanly. Route Handlers can be called directly over HTTP by anyone.

**Not configured.** Without all three variables (`config/env.ts → authEnv()`, which also rejects mismatched test/live keys), Clerk is never initialized, so its keyless mode never runs. Every admin page shows "Admin unavailable", with the missing variable names shown outside production only, and admin APIs return 404. There is no bypass in any environment.

**Admin UI.** The admin is English-only: one user, so translated chrome would be duplication with no reader. The *content* it will manage stays bilingual, through the translation tables. It has its own root layout (`app/admin/layout.tsx`): shared fonts (`styles/fonts.ts`), theme script, tokens, and atmosphere, with `ClerkProvider` inside `<body>` and Clerk themed through token variables in a `clerk` CSS layer below the utilities. The shell is a floating glass sidebar on `lg+` and a top bar with the site's drawer below that. Its navigation lists only working destinations (`config/admin.ts`). Account management opens Clerk's own profile modal. Sign-out ends the session, then `location.replace('/admin/sign-in')`, so no admin UI survives in the router cache or history. Admin responses carry `X-Robots-Tag: noindex` and `robots.txt` disallows `/admin`.

**Writing an admin operation** (the shape every `mutations.ts` follows; see **Content management**):

```ts
// features/profile/mutations.ts
'use server';
export async function saveProfileRoles(input: unknown) {
  const admin = await requireAdmin();                         // 1. authorize (always first)
  return runMutation(profileRolesInput, input, async (data) => { // 2. validate (errors → fieldErrors)
    const saved = await service.saveProfileRoles(data, admin);   // 3. write (one transaction)
    updateTag(CACHE_TAGS.profile);                               // 4. refresh public reads
    return saved;                                                // → the editor's new baseline
  });
}
```

Never call `getAuthorization()` inside a `'use cache'` scope; `connection()` makes that an error by design.

## Content management

The admin edits content through small, focused pieces rather than a generic CMS framework. Profile (`/admin/profile`, with Details · Roles · Highlights · Metrics tabs) and Configuration (`/admin/configuration`) are the reference implementations.

**Layers** (per domain):

| Layer | File | Knows about |
|---|---|---|
| Schema | `features/*/schema.ts` | Zod. Editor schemas reuse the content schemas the seed uses, adding row `id`s and blank→null handling |
| Repository | `features/*/repository.ts` | SQL. Uncached editor reads (hidden rows, every locale's raw translation) and writes that take a `Database` (a transaction) and an actor |
| Service | `features/*/service.ts` (server-only) | Domain operations: `load*` for editors, `save*` = one `withTransaction` + re-read. No React, forms, or HTTP, so a future API route or SDLC sync calls the same functions |
| Server Actions | `features/*/mutations.ts` | The four steps above. Return `MutationResult<T>` (`lib/cms/result.ts`): `{ ok, data, savedAt }` or `{ ok: false, fieldErrors, formError }`. Unexpected errors are logged and reported generically |
| Editor | `features/*/components/admin/*` (client) | Imports its Server Action directly; built from `components/admin/form` |
| Page | `app/admin/(console)/…/page.tsx` | `requireAdmin()`, `service.load*()`, render the editor |

**Write conventions** (`lib/cms/write.ts`):
- `syncTranslations`: each locale present is upserted, each absent one deleted.
- `reconcileList`: an ordered list replaces the stored one. Known ids update, anything else inserts (an id from the client is never trusted to exist), missing rows delete, list position is `sort_order`.
- One logical save is one transaction. A single-row update (site settings) needs none.

**Bilingual editing.** One language at a time behind `English | Español` tabs (`LocaleTabs`), each showing Complete / Incomplete / Not translated, or its error count after a failed save. The rule, enforced by the schema (`lib/validation.ts → localized`), not by the UI:
- English is required.
- A Spanish translation whose fields are all blank is *absent*: no row is stored, and public reads fall back to English as before.
- A partly filled Spanish translation is validated in full ("complete it or clear it").
- English is never copied into Spanish. The Spanish tab shows the English text as placeholders and explains the fallback once.

Status comes from the same schema the server saves with (`lib/cms/locale.ts`), so the badge and the save always agree.

**Editor primitives** (`components/admin/form`):
- `useEditor(initial, action)`: values plus a saved baseline (dirty = deep inequality), path-keyed server errors (cleared as each field is edited), and a save that ignores duplicate submits while one is in flight. On success the baseline becomes what the server stored, so new rows get their ids.
- `EditorForm`: disables fields while saving and has a sticky glass save bar (status, Discard, Save; Ctrl/⌘+S). The status is announced; a failure takes focus.
- Unsaved changes: `beforeunload`, a confirm on in-app link clicks, and browser back/forward (`lib/client/history-guard.ts`). Browsers can't cancel a history traversal, so while an editor is dirty a same-URL sentinel entry (a copy of Next's history state) sits on top: Back lands on the page's own entry and asks; Stay re-adds the sentinel, Leave steps back once more. Saving or discarding consumes the sentinel; navigate programmatically after a save only after `await historySettled()`. A dirty editor has no forward history.
- `useEditor` also exposes `baseline` (what the server stored), `submit(override)` (save with a field changed for this save only, e.g. Publish), and `reset(values)` (adopt state the server returned from elsewhere, e.g. an upload).
- Fields (`TextField`, `SelectField`, `SwitchField`, `StringListField`) wire label, hint, and error with `aria-describedby` / `aria-invalid`.
- `RepeatableList` reorders with move up/down buttons, so it works from the keyboard. Nothing is written until Save, so Discard undoes a removal.
- `SortableList` adds drag-and-drop by a handle (native DnD) to the same move buttons and announces moves. `ConfirmDialog` (native `<dialog>`, Cancel focused, optional type-to-confirm) guards destructive actions. `ImageUploadField` picks or drops one image with a local preview; the server decides what the file is.
- A service throws `FieldValidationError` for rules only the database can check (a slug in use) and `NotFoundError` for a vanished row; `runMutation` reports them as field / form errors.

**Cache invalidation.** Each action calls `updateTag` for the tag its public reads use: `profile` (profile, roles, highlights, and metrics; metrics are also tagged `projects`/`skills` for derived counts), `site` (settings, page and section copy), and `projects` (every project write, including order and media). `updateTag` exists only in Server Actions, so the upload Route Handlers use `revalidateTag(tag, { expire: 0 })`, which serves no stale content either. Editor reads are uncached.

**Projects** (`/admin/projects`: list · new · order · `[id]` Details · `[id]/media` · `[id]/preview`).
- *Publication.* Draft and Published (legacy `archived` rows read as Archived). Save keeps the status, so a published project's edits go live on save; Publish / Unpublish are the same save with the other status (`submit({ status })`). Going live stamps `published_at`. No staged revisions. Every public read (list, slug lookup, retired slugs, sitemap slugs) filters `published`; the admin preview renders the real `ProjectDetail` from an unfiltered read.
- *Slugs.* A slug change on a project that has ever been public retires the old slug into `project_slug_history` (308). A slug another project uses or used is a field error; a project may take back its own retired slug.
- *Order.* One `sort_order`. The public page shows featured projects first, then the rest, each in order, so the Order page edits the two groups and saves them featured-first; new projects go last. Nothing is ordered by date or id.
- *Delete* is permanent (cascades) and needs the slug typed, re-checked on the server; Unpublish is the reversible option.
- *Technologies* are picked from the shared vocabulary; a new name adds a `technologies` row (existing names are never changed here).
- *Images.* Upload (`POST /api/admin/projects/[id]/media`) and replace (`PUT …/media/[assetId]`) are Route Handlers (`adminRoute`): files exceed the Server Action body limit. Limits: 4 MB (under Vercel's 4.5 MB request cap); JPEG, PNG, WebP, AVIF decided from the bytes (`lib/image-file.ts`), never from the client's file name or MIME type; the server builds the object path (`projects/<project id>/<uuid>.<ext>`, public, never overwritten). Order, hero, alt text, captions, and removals are an ordinary editor save. A project's first image becomes its hero.
- *Storage consistency* (`features/projects/service.ts`): a file is written before its transaction and deleted again if the transaction fails; files are deleted only after the transaction that dropped them commits, and only when no other row references the asset. A failed delete is logged (an orphaned file), never a failed save. `integrations/blob` deletes only URLs on a Vercel Blob public host under a known prefix. Services take a `MediaStore` (default: Blob), so tests and future callers can substitute storage.
- `adminRoute` refuses non-GET requests whose `Origin` isn't the site (CSRF), on top of the admin check.

**Configuration vs Profile.** Configuration owns `site_settings` only: brand mark, monogram, GitHub username and section switch, default theme. Personal content is Profile. Social links, contact, and page/section copy get their own editors.

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
- The username is a site setting (`site_settings.github_username`); only the token is an env var. `GITHUB_TOKEN` is optional: without it the section renders its fallback and the build logs one `GitHub integration not configured` warning.

**Resend / contact** (`features/contact` → `integrations/resend`)
- One Zod schema (`contact/schema.ts`) validates in the browser for instant feedback and again in the Server Action, which is the trust boundary. Error messages are dictionary keys, so both sides render in the visitor's language.
- The Server Action works without JavaScript (`useActionState`). It also handles the honeypot, rejects header injection, HTML-escapes the email body, and sends the visitor's address as Reply-To (never From).
- Secrets and addresses are read only in `integrations/resend/client.ts` through `config/env.ts`.

**Observability.** `lib/logger.ts` writes one structured JSON line per event (`scope`, `level`). Integrations log their failures there. It's the single place to attach an error-reporting service later.

## Future insertion points

- **CMS (rest of Phase 4):**
  - Each new editor copies the Profile/Projects shape in **Content management**: schema → repository (editor reads + writes) → `service.ts` → `mutations.ts` → editor component → console page. Add `authorship` columns to its tables (migration in the same change) and its entry to `ADMIN_NAV` in `config/admin.ts` (Content: Skills, Experience, Resume · Site: Social links, Contact, Page content).
  - Phase 4C (Skills, Experience): reuse `SortableList` for ordering, `SectionTabs` for sub-editors, and the technology vocabulary the project editor already extends. Skills management owns renaming and removing technologies.
  - Other images (profile headshot, later media): reuse `ImageUploadField`/`sendUpload`, `lib/image-file.ts`, and `MediaStore`; add a prefix to `MEDIA_PREFIXES` in `integrations/blob/store.ts` and a Route Handler shaped like the project one. `media_assets` rows stay behind `resolveMedia`.
  - Resume management: PDF bytes in Vercel Blob (private, served through an admin Route Handler for old versions), metadata in a `resume_versions` table with an explicit `is_current` / published pointer rather than "latest upload". `/resume` reads only the current version.
- **Public API:** `app/api/v1/*` route handlers calling the same `queries.ts` and mapping domain types to versioned DTOs. Nothing in the domain layer depends on HTTP.
- **SDLC Manager (Phase 6):**
  - Sync goes through the domain mutations, never straight to tables or UI.
  - Store external links and synced fields in a dedicated table (e.g. `project_sources`: project id, source, external id, synced-at).
  - Portfolio-owned fields (status, featured, order, media, translations) stay authoritative and are never overwritten by sync.

## Design system

"Systems Editorial + premium glass": typography and whitespace carry hierarchy; glass is reserved for the surfaces that matter.

- **Tokens** (`styles/tokens.css`). Semantic roles only, in OKLCH, redefined per theme on `<html data-theme>`:
  - canvas / surface (`surface`, `-raised`, `-inset`, `-glass`, `-glass-strong`)
  - `fg` / `fg-muted` / `fg-faint`, and `line` / `line-strong` / `line-glass`
  - `brand` (blue: actions) with `brand-fg` (text-safe on either theme); `accent` (brass: indices and small emphasis, never a CTA)
  - `success` / `warning` / `danger` / `focus`
  - Every text role clears WCAG AA on canvas and on glass in both themes.
- **Theme** (`styles/globals.css`). Tokens map to Tailwind utilities (`bg-canvas`, `text-fg-muted`, `border-line`, `text-brand-fg`, …). The theme also defines:
  - a fluid type scale: `text-display-xl` … `text-h3`, `text-body-lg`, `text-body`, `text-body-sm`, `text-label`, `text-micro`
  - section rhythm (`pt-section`), gutter (`px-gutter`), and container (`max-w-site`)
  - radius tiers (`rounded-sm` 8 → `rounded-xl` 26), four shadows, and motion easings
- **Where CSS is allowed** (`styles/system.css`). Only what CSS expresses best:
  - `.glass` / `.glass-strong`, the single glass implementation
  - the reveal states, the background atmosphere, the project identity art, and the heatmap levels

  Everything else is utilities in components. Inline `style` is only for runtime custom properties (`--d`, `--weeks`, `--lang`, `--hue`) and `global-error.tsx`.
- **Glass budget.** Command bar, drawer, palette, hero portrait, featured project cards, data panels (snapshot, contributions), project metadata, resume header, contact form, current role. Lists, timelines, and stacks use hairlines and type instead of boxes.
- **Primitives** (`components/ui`). One `Surface` (variants plain / raised / inset / glass / glass-strong) instead of card variants, and `buttonStyles()` shared by `<button>`, `<a>`, and `<Link>` (variants primary / secondary / ghost / quiet / danger, the last outlined so the danger hue only carries text). `Status`, `Tag`/`TagList`, `Stat` (+ `statDividers`), `Eyebrow`, `SectionHeader`, `Section`/`Container`, `Prose`, and `SystemState` complete the set.
- **Class composition.** `cn()` joins classes but does not merge conflicts. Don't pass a utility that fights a component's own (e.g. `hidden` against an `inline-flex`). Wrap the element or add a prop instead.
- **Motion.** Interactions take 160–220ms; entrances take 520ms with opacity and a 12px rise. Nothing loops. `prefers-reduced-motion` disables transitions and animations globally.

## Conventions

- Feature-first folders. Add a domain by copying the `types / schema / repository / queries / components` shape, and only the parts you need.
- No `any`. Casts only where a library boundary requires one, with a comment.
- Server Components by default. A Client Component needs a concrete interactive reason.
- Never render `Date.now()` or `new Date()` into cached server output. Use the client time components (`RelativeTime`, `LocalTime`).
- Scroll reveals render state through React (`useInView`). Never mutate React-owned DOM from outside React.
- Commands: `npm run check` (typecheck + lint + tests) before committing. `npm run build` needs a `DATABASE_URL`; `pglite:memory://` works locally.
- Tooling: Node is pinned to `24.x` (`engines`), which Vercel follows. `allowScripts` in `package.json` approves install scripts per reviewed version (`esbuild`, `unrs-resolver`); after a dependency update, review new ones with `npm approve-scripts`. ESLint is on 10.x; three plugins bundled in `eslint-config-next` (`import`, `jsx-a11y`, `react`) still declare a peer range ending at 9, so `npm install` prints peer-override warnings until they catch up.

## Replaced in Phase 1

- **Vite SPA, React Router, and the client-only context.** Replaced by the Next.js App Router with Server Components and the Metadata API. Pages are now server-rendered and indexable in both languages.
- **`siteData.js` / `siteStrings.js`** (content duplicated per language). Replaced by the Neon domain model plus typed UI dictionaries.
- **`api/github.js`, `api/contact.js`, the CORS allowlist, `VITE_API_BASE_URL`, and the `api.alexball.dev` API portal.** Replaced by in-process cached services and a Server Action. The subdomain now redirects to the main site.
- **The `scrollWatcher` singleton and `window.__animReady` global.** Replaced by one shared IntersectionObserver hook.
- **Build-time JSON-LD injection and runtime `<head>` mutation.** Replaced by server-rendered metadata and JSON-LD.
- **The static `sitemap.xml`, `robots.txt`, and `site.webmanifest`.** Replaced by generated `app/sitemap.ts`, `app/robots.ts`, and `app/manifest.ts`.
