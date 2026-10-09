# Architecture — alexball.dev

An English-only software-engineering portfolio, built as one full-stack Next.js application. This document describes the system as it exists after **Phase 5C (portfolio experience, polish & SEO) is complete**: Phase 1 laid the architecture, Phase 2 the design system, Phase 3 the private `/admin`, Phase 4A the first write paths (Profile and Configuration editors) plus the conventions the remaining editors follow, Phase 4B the Projects editor with its publication workflow, ordering, and Vercel Blob images, Phase 4C the Skills, Experience, Social links, Contact, and Page content editors, Phase 4D versioned resume PDFs in private Blob storage with an explicit Publish pointer, Phase 5A project case studies: structured sections, curated milestones, and related projects (see **Content management**), and Phase 5B GitHub intelligence: verified multi-repository associations and per-project analytics (see **Integrations → GitHub**), and Phase 5C the home page, project discovery, skills-to-projects links, and an SEO/share-card audit (see **Public experience** and **Language and SEO**). After 5C the site dropped its Spanish version: content has one canonical (English) representation, and `/es/…` URLs redirect to the English pages (see **Language and SEO**). Every piece of public content has exactly one admin owner.

## Stack

| Concern | Choice |
|---|---|
| Language / UI | TypeScript (strict), React 19 |
| Framework | Next.js 16, App Router, **Cache Components** (`'use cache'`), Partial Prefetching |
| Styling | Tailwind CSS v4 utilities over a semantic OKLCH token design system (see **Design system**) |
| Database | Neon Postgres via **Drizzle ORM** (`neon-http` driver), migrations by drizzle-kit |
| Media storage | Vercel Blob: a public store for project images, a private store for resume PDFs; metadata in Postgres |
| Validation | Zod 4 (env, external APIs, content inputs, contact form) |
| Email | Resend |
| Hosting | Vercel (Fluid Compute, Node runtime) |
| Tests | Vitest + PGlite (real Postgres, in-process) |
| Auth | Clerk (`@clerk/nextjs`) for identity on `/admin` only; authorization is the app's own (single admin, see **Authentication & admin**) |

## Request flow

```
request ─► src/proxy.ts ─► app/(site)/… (Server Components)
              │                    │
   legacy /es redirects     features/*/queries.ts   ← cached ('use cache' + cacheTag)
   api.* → alexball.dev            │
                            features/*/repository.ts ← only code that touches the DB
                                   │
                              src/db (Drizzle) ─► Neon
```

Admin requests (`/admin`, `/api/admin`) take a separate branch in `proxy.ts`: Clerk resolves the session before the first authorization check (see **Authentication & admin**).

Pages are thin compositions: call cached query functions, render feature components. Nearly every route is **fully prerendered** and revalidated by time or by tag. The Projects page refreshes every 15 minutes because it includes live GitHub data.

## Directory layout

```
src/
  app/(site)/             routes: home, about, projects, projects/[slug], experience, resume, contact,
                          not-found, error, [...rest] (404 catch-all); layout = root layout (html/body)
  app/admin/              the private admin (English-only, its own root layout): sign-in/[[...sign-in]],
                          (console)/ (guarded layout, dashboard, profile/{,headshot,roles,highlights,metrics},
                          configuration, projects/{,new,order,[id]/{,case-study,media,milestones,related,github,preview}}, skills/{,technologies}, experience,
                          resume, social-links, contact, content/{,[page]}, [...rest] 404), not-found, error
  app/api/admin/          admin Route Handlers (session: the reference handler; projects/[id]/media{,/[assetId]}: image uploads;
                          profile/headshot: headshot upload; resume: PDF upload; resume/[id]: any version's PDF, admin only)
  app/                    resume.pdf/ (public: the published resume only), og/[...card] (generated share cards), sitemap.ts, robots.ts, manifest.ts, global-error.tsx
  proxy.ts                legacy /es and /en redirects (public) + Clerk and the admin gate (admin, Server Actions)
  server/auth/            admin authorization: policy (the rule), gate (proxy decision), admin (requireAdmin…), route (adminRoute)
  config/                 env.ts (Zod, server-only), site.ts (URLs, ids, the site language), navigation.ts (route structure),
                          admin.ts (admin paths + console navigation), copy.ts (UI copy + `fill`)
  db/                     client.ts (app, HTTP), schema/*, migrations/ (committed SQL), seed/ (initial content),
                          prepare.ts (migrate + bootstrap), admin/ (tooling target + direct connection),
                          cli/ (db:* scripts and their .env.local loader; never imported by the app), local.ts
  features/<domain>/      types.ts (domain types) · schema.ts (Zod inputs) · repository.ts (DB) ·
                          queries.ts (cached reads) · components/ (feature UI)
                          admin-managed domains add: service.ts (editor loads + transactional saves) ·
                          mutations.ts (Server Actions) · components/admin/ (editor islands) · upload.ts (projects: image upload specifics; projects also has case-study.ts: section kinds, milestone kinds, video embeds, related picking)
                          resume adds delivery.ts (read-only file access + PDF response for the two delivery routes)
      projects  skills  experience  resume  profile  site  github  contact  admin (dashboard facts)
  integrations/           github/ (typed API client + Zod response schemas), resend/,
                          blob/ (store.ts: MediaStore over the public store; private-store.ts: DocumentStore over the private store)
  components/layout/      site chrome: SiteChrome (command bar + drawer + palette), BackToTop, Preferences, Footer, Pager, PageShell, Screen
  components/admin/       console UI: AdminShell, AdminNav, AdminTopBar (bar + drawer), AccountActions, AdminPageHeader, AdminLoading,
                          AdminUnavailable, SectionTabs, ConfirmDialog, clerk-appearance (Clerk themed with the tokens)
  components/admin/form/  editor primitives: useEditor, EditorForm (+ save bar), EditorSection, fields, RepeatableList,
                          SortableList (drag + move buttons), ImageUploadField (+ checkImageFile, sendUpload),
                          TechnologyPicker (the shared vocabulary; Projects and Skills)
  components/ui/          design-system primitives (Container, Section, SectionHeader, Eyebrow, Prose, Stat, Status,
                          Tag, Surface, SystemState, buttonStyles) + Icon, Reveal, CountUp, RelativeTime, LocalTime, JsonLd
  lib/                    github-repository (repository reference parsing), legacy-locale (old /es, /en paths), logger, errors (incl. FieldValidationError, NotFoundError), media resolution, image-file (byte sniffing),
                          pdf-file (PDF byte check, safe file names), cache tags/lifetimes, seo/, validation, client/ (incl. history-guard),
                          cms/ (mutation result + runner, upload request plumbing, write conventions, form value helpers, slugify)
  styles/                 tokens.css (semantic roles per theme), globals.css (Tailwind theme), base.css, system.css
  test/                   PGlite test DB helper, server-only stub
```

**Dependency rules**
- `app/` → `features/*/queries` → `features/*/repository` → `db/`. UI never imports `db/` or `integrations/`.
- Repositories return **domain types** (`features/*/types.ts`), never Drizzle rows.
- `integrations/*` know nothing about UI or the domain model; they validate and normalize upstream data.
- Every server-only module imports `server-only`.
- Client Components are limited to interactive islands: nav/drawer/palette, the back-to-top button, the theme toggle, the contact form, the experience tabs, the role cycler, the project gallery lightbox (`GalleryLightbox`, native `<dialog>`), the projects explorer (`ProjectExplorer`: search and filters over server-rendered cards), `PointerGlow` (renders nothing: writes `--pointer-x/-y` so the two background glows drift a few pixels toward the mouse; fine pointers only, off under reduced motion), and the small `Reveal`/`CountUp`/`RelativeTime`/`LocalTime` primitives. In the admin: the nav (active state), the mobile drawer, the account actions, Clerk's own sign-in, and the editors (`features/*/components/admin`). Server children pass through client wrappers unchanged.
- Nothing public imports Clerk or `server/auth`; the public site has no auth-aware components. The one feature file allowed the guard is `features/*/mutations.ts`. Public routes (every `app/` route outside `app/admin` and `app/api/admin`, including `resume.pdf`) and chrome never import mutations, services, or admin UI, and client modules reach the server only through Server Actions (all enforced by `server/auth/boundaries.test.ts`).

## Domain model (Neon)

Every field is stored once, in English, on its own row: a project's name and summary are columns of `projects`, a section's heading is a column of `project_sections`, and so on. There are no translation tables and no locale column; migration `0012_english_only` folded the former `*_translations` tables into their parent tables (keeping the English text) and dropped Spanish.

| Area | Tables |
|---|---|
| Projects | `projects` (slug, `status` draft/published/archived, featured, sort, live, links, published/archived timestamps, name, tagline, summary, `body` paragraphs) · `project_slug_history` (retired slugs → 308) · `project_repositories` (0..n: GitHub's stable `github_id` + canonical owner/name, optional `repository_label`, primary, order; unique per project by name and by id) · `projects.github_analytics_visible` (the analytics switch, default off) · `project_technologies` · `project_media` (role cover/gallery; at most one cover per project) · **case study:** `project_sections` (`kind`, `visible`, order, `video_url`, heading, `body` paragraphs) · `project_section_items` (title, body) · `project_section_media` (ordered references to the project's own images) · `project_milestones` (date + `milestone_date_precision` day/month/year, `milestone_kind`, link, optional image, `visible`, title, description) · `project_relations` (directional explicit picks, ordered; CHECK not self) |
| Skills | `technologies` (shared vocabulary) · `skill_categories` (name, `kind` stack/learning, icon, accent, status) · `skill_category_technologies` |
| Experience | `experiences` (career/education, organization + optional label, role, type, location, summary[], tags[], real dates + precision, current) |
| Profile | `profile` (single row: identity, title, statement, about[], hero copy) · `social_links` · `profile_roles` (label) · `profile_highlights` (differentiator/resume; title, body) · `snapshot_metrics` (`source` static/published_projects/technologies: derived values are counted from published content at read time) |
| Site | `site_settings` (single row: brand, GitHub username, feature switch, default theme) · `page_content` (per-page SEO copy, one row per page) · `section_content` (section headings: eyebrow, title, subtitle, body, and `aside`, a secondary heading: About's differentiators heading, Stack's learning-banner label) |
| Media | `media_assets` (`storage` static/blob/external, src, MIME type, dimensions, alt text, optional caption) |
| Resume | `resume_versions` (private Blob `pathname`, sanitized `file_name`, size, optional admin `label`, `is_published` + `published_at`; a partial unique index allows at most one published row). `profile.resume_asset_id` is **deprecated** (nothing reads it since 4D; drop it in a later release) |
| System | `content_bootstrap` (single row: this database has received its initial content) |

**Authorship.** Admin-managed tables carry nullable `created_by` / `updated_by` (the admin's Clerk user ID, from `requireAdmin()`; `authorship` in `db/schema/_shared.ts`). Present on `profile`, `profile_roles`, `profile_highlights`, `snapshot_metrics`, `social_links`, `site_settings`, `page_content`, `section_content`, `projects`, `project_sections`, `project_milestones`, `media_assets`, `skill_categories`, `technologies`, `experiences`, `resume_versions` (where `created_by` is the uploader). A new admin-managed table adds them in the same change. Seeded rows have null.

**Lifecycle.** Public reads return only `published` (or `visible`) rows ordered by `sort_order`. Archiving is a soft delete that keeps history and slug redirects intact.
**Slugs.** `projects.slug` is the current public URL. When a slug changes, the old one goes into `project_slug_history`, and `/projects/<old>` answers with a permanent redirect.
**Media.** Consumers only ever see a resolved `MediaAsset` (`lib/media.ts`), so assets can move from `/public` to Vercel Blob or an external URL without touching the UI.

**What stays in code:** UI chrome strings (`config/copy.ts`: nav, buttons, form labels and messages, aria text, 404/error copy, palette keywords), the route and navigation structure, which sections each page shows, the icon set, design tokens, and infrastructure configuration. Everything content-like is in the database and has an editor in `/admin`.

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

- Migrations run *before* the new build goes live, while the previous deployment is still serving. Keep them backward compatible: add first, remove in a later release. `0012_english_only` is a deliberate exception: it adds the English columns, copies the text, and drops the translation tables in one release, so for the few minutes of that deploy the previous deployment's uncached reads and admin saves fail (prerendered pages keep serving).
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

**Admin UI.** It has its own root layout (`app/admin/layout.tsx`): shared fonts (`styles/fonts.ts`), theme script, tokens, and atmosphere, with `ClerkProvider` inside `<body>` and Clerk themed through token variables in a `clerk` CSS layer below the utilities. The shell is a floating glass sidebar on `lg+` and a top bar with the site's drawer below that. Its navigation lists only working destinations (`config/admin.ts`). Account management opens Clerk's own profile modal. Sign-out ends the session, then `location.replace('/admin/sign-in')`, so no admin UI survives in the router cache or history. Admin responses carry `X-Robots-Tag: noindex` and `robots.txt` disallows `/admin`.

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

The admin edits content through small, focused pieces rather than a generic CMS framework. Profile (`/admin/profile`, with Details · Headshot · Roles · Highlights · Metrics tabs) and Configuration (`/admin/configuration`) are the reference implementations.

**Layers** (per domain):

| Layer | File | Knows about |
|---|---|---|
| Schema | `features/*/schema.ts` | Zod. Editor schemas reuse the content schemas the seed uses, adding row `id`s and blank→null handling |
| Repository | `features/*/repository.ts` | SQL. Uncached editor reads (hidden rows included, exactly as stored) and writes that take a `Database` (a transaction) and an actor |
| Service | `features/*/service.ts` (server-only) | Domain operations: `load*` for editors, `save*` = one `withTransaction` + re-read. No React, forms, or HTTP, so a future API route or SDLC sync calls the same functions |
| Server Actions | `features/*/mutations.ts` | The four steps above. Return `MutationResult<T>` (`lib/cms/result.ts`): `{ ok, data, savedAt }` or `{ ok: false, fieldErrors, formError }`. Unexpected errors are logged and reported generically |
| Editor | `features/*/components/admin/*` (client) | Imports its Server Action directly; built from `components/admin/form` |
| Page | `app/admin/(console)/…/page.tsx` | `requireAdmin()`, `service.load*()`, render the editor |

**Write conventions** (`lib/cms/write.ts`):
- `reconcileList`: an ordered list replaces the stored one. Known ids update, anything else inserts (an id from the client is never trusted to exist), missing rows delete, list position is `sort_order`.
- One logical save is one transaction. A single-row update (site settings) needs none.

**Editor primitives** (`components/admin/form`):
- `useEditor(initial, action)`: values plus a saved baseline (dirty = deep inequality), path-keyed server errors (cleared as each field is edited), and a save that ignores duplicate submits while one is in flight. On success the baseline becomes what the server stored, so new rows get their ids.
- `EditorForm`: disables fields while saving and has a sticky glass save bar (status, Discard, Save; Ctrl/⌘+S). The status is announced; a failure takes focus.
- Unsaved changes: `beforeunload`, a confirm on in-app link clicks, and browser back/forward (`lib/client/history-guard.ts`). Browsers can't cancel a history traversal, so while an editor is dirty a same-URL sentinel entry (a copy of Next's history state) sits on top: Back lands on the page's own entry and asks; Stay re-adds the sentinel, Leave steps back once more. Saving or discarding consumes the sentinel; navigate programmatically after a save only after `await historySettled()`. A dirty editor has no forward history.
- `useEditor` also exposes `baseline` (what the server stored), `submit(override)` (save with a field changed for this save only, e.g. Publish), and `reset(values)` (adopt state the server returned from elsewhere, e.g. an upload).
- Fields (`TextField`, `SelectField`, `SwitchField`, `StringListField`) wire label, hint, and error with `aria-describedby` / `aria-invalid`.
- `RepeatableList` reorders with move up/down buttons, so it works from the keyboard. Nothing is written until Save, so Discard undoes a removal.
- `SortableList` adds drag-and-drop by a handle (native DnD) to the same move buttons and announces moves. `ConfirmDialog` (native `<dialog>`, Cancel focused, optional type-to-confirm) guards destructive actions. `ImageUploadField` picks or drops one image with a local preview; the server decides what the file is.
- A service throws `FieldValidationError` for rules only the database can check (a slug in use) and `NotFoundError` for a vanished row; `runMutation` reports them as field / form errors.

**Cache invalidation.** Each action calls `updateTag` for the tag its public reads use: `profile` (profile, roles, highlights, metrics, and social links; metrics are also tagged `projects`/`skills` for derived counts), `site` (settings, page and section copy, contact copy), `projects` (every project write, including order and media), `skills` (categories; technology renames and removals also refresh `projects`), `experience`, and `resume` (publish, unpublish, delete; read by the resume page, footer, palette, and dashboard). `updateTag` exists only in Server Actions, so the upload Route Handlers use `revalidateTag(tag, { expire: 0 })`, which serves no stale content either. Editor reads are uncached.

**Projects** (`/admin/projects`: list · new · order · `[id]` Details · `[id]/case-study` · `[id]/media` · `[id]/milestones` · `[id]/related` · `[id]/github` · `[id]/preview`).
- *Publication.* Draft and Published (legacy `archived` rows read as Archived). Save keeps the status, so a published project's edits go live on save; Publish / Unpublish are the same save with the other status (`submit({ status })`). Going live stamps `published_at`. No staged revisions. Every public read (list, slug lookup, retired slugs, sitemap slugs) filters `published`; the admin preview renders the real `ProjectDetail` from an unfiltered read.
- *Slugs.* A slug change on a project that has ever been public retires the old slug into `project_slug_history` (308). A slug another project uses or used is a field error; a project may take back its own retired slug.
- *Order.* One `sort_order`. The public page shows featured projects first, then the rest, each in order, so the Order page edits the two groups and saves them featured-first; new projects go last. Nothing is ordered by date or id.
- *Delete* is permanent (cascades) and needs the slug typed, re-checked on the server; Unpublish is the reversible option.
- *Technologies* are picked from the shared vocabulary; a new name adds a `technologies` row (existing names are never changed here).
- *Images.* Upload (`POST /api/admin/projects/[id]/media`) and replace (`PUT …/media/[assetId]`) are Route Handlers (`adminRoute`): files exceed the Server Action body limit. Limits: 4 MB (under Vercel's 4.5 MB request cap); JPEG, PNG, WebP, AVIF decided from the bytes (`lib/image-file.ts`), never from the client's file name or MIME type; the server builds the object path (`projects/<project id>/<uuid>.<ext>`, public, never overwritten). Order, hero, alt text, captions, and removals are an ordinary editor save. A project's first image becomes its hero.
- *Storage consistency* (`features/projects/service.ts`; the headshot follows the same rules): a file is written before its transaction and deleted again if the transaction fails; files are deleted only after the transaction that dropped them commits (`lib/cms/media-files.ts`), and only when no other row references the asset (`deleteUnreferencedAssets` in `db/media.ts`, which checks projects and the profile). A failed delete is logged (an orphaned file), never a failed save. Static (bundled) assets are never deleted. `integrations/blob` deletes only URLs on a Vercel Blob public host under a known prefix (`projects/`, `profile/`). Services take a `MediaStore` (default: Blob), so tests and future callers can substitute storage.
- `adminRoute` refuses non-GET requests whose `Origin` isn't the site (CSRF), on top of the admin check.
- *Case study* (`[id]/case-study`). Optional, reorderable sections of fixed kinds: narrative, highlights, architecture, challenges & solutions, lessons, results, gallery, video. Which fields a kind uses (paragraphs required/optional/none, entries, images, video URL) is a code map, `SECTION_SPECS` in `features/projects/case-study.ts`, shared by validation, the editor, and the renderers. Fields a kind doesn't use are rejected, not ignored. Paragraphs use a small markup (`lib/inline-markup.ts`: bold, emphasis, code, http(s)/site-path links, "- " bullets) parsed into data and rendered as React nodes by `components/ui/RichText`, with no HTML path at all. Video: YouTube/Vimeo are embedded from the parsed id only (`youtube-nocookie`, Vimeo `dnt`); any other URL is a link.
- *Milestones* (`[id]/milestones`). Curated by hand, never inferred from commits; GitHub activity is a separate source with its own block. Public order is chronological (oldest first); editor list position only breaks same-date ties ("Sort by date" mirrors the public order). Date + precision (day/month/year) formatted with `Intl` in UTC (`features/projects/format.ts`).
- *GitHub* (`[id]/github`). The project's repositories (owner/name or any github.com URL, parsed by `lib/github-repository.ts`), each with an optional label from a fixed set (`REPOSITORY_LABELS`), one primary, and an order; plus the analytics switch. On Save the service verifies every new, changed, or never-verified row with GitHub (`resolvePublicRepository`, uncached): only **public** repositories are accepted, stored with GitHub's stable id and canonical name; two rows resolving to one id are a field error; an unchanged, never-verified row survives a GitHub outage, a new one doesn't. Rows are parked on their own id before reconciling, so swaps never trip the unique indexes. The editor shows what GitHub says about each stored row (public / archived / renamed / private / not found / unreachable / not configured), never a credential. Repositories moved here from Details.
- *Related* (`[id]/related`). Explicit, ordered, directional picks of any other project (max 6). The page resolves them with `pickRelated` against the published list it already loads, so a draft or deleted project can't surface; it shows at most 3 as compact `ProjectCard`s.
- *Visibility instead of staging.* These editors keep the Phase 4 contract (GitHub analytics too: the switch starts off and Preview shows the section marked Hidden): each Save is one transaction (no partial publication) and is public at once if the project is published. Every section and milestone has a `visible` switch and **new ones start hidden**, so content can be drafted on a live project and checked in Preview (which renders hidden items marked "Hidden") before switching it on. Drafts' case studies are never public: every public read starts from a `published` project.
- *Media references.* Sections and milestones refer only to images already in the project's `project_media` (checked in the save transaction); uploads, alt text, and captions stay on the Media tab, so one image can appear in several places with no copy. Removing an image on the Media tab detaches it from that project's sections and milestones in the same transaction; files are still deleted only when no `project_media` or profile row references the asset.
- *Page.* `ProjectDetail` composes: hero → cover → numbered blocks (Overview, each visible section, the legacy auto-gallery only when no gallery section exists, the timeline, then "Development activity" when the page passes its `github` slot) beside a sticky glass panel (metadata + "On this page") → related projects → pager. The page's Open Graph image is its generated project share card, which shows the cover.

**Skills** (`/admin/skills`: Categories · Technologies).
- *Categories.* One form, two ordered lists: Stack (the About page's groups) and Learning next (the highlighted banners). The kind is the list a category is in; position is `sort_order`. Visible = `published`, hidden = `draft` (legacy `archived` reads as hidden). Icons come from the code-owned icon set, never stored markup. A save first parks every slug on its row id, so renames and swaps never trip the unique index mid-transaction.
- *Technologies.* The shared vocabulary of project stacks and categories. New names are added from either picker (`TechnologyPicker`); this tab owns renaming (name only; slugs are stable) and removing, which the service refuses while any project or category still lists the technology.

**Experience** (`/admin/experience`). One form with Career and Education lists in explicit public order; "Sort by date" reorders a list in the editor (current first, then most recent), stored only on Save. Date rules (`experiencesInput`): end ≥ start; an entry that isn't current needs an end; a current one ends blank (Present) or in the future (Expected). The organization is a proper noun; an optional label replaces it on the page ("Career break").

**Social links** (`/admin/social-links`; `features/profile` owns the table). Ordered list of platform, label, URL, handle, and visibility. URLs are http(s) only, so no `javascript:`/`mailto:` reaches an href; the platform enum picks the icon (`PLATFORM_ICONS`); links keep the site's external-link behavior (new tab, `noopener`).

**Contact** (`/admin/contact`) owns the contact section's copy: eyebrow, h1, introduction (`section_content.contact`). It shows, read-only with links, what other owners hold: the public email (Profile), the channels (Social links), whether Resend is configured (never an env value), and the page's SEO copy (Page content). The form, Server Action, honeypot, and Resend integration are unchanged; form labels and messages are interface chrome in the dictionaries.

**Page content** (`/admin/content`, `/admin/content/[page]`). One editor per public page: its SEO title and description (`page_content`) and the headings of the sections it shows (`section_content`). Which page shows which section, and which fields each section renders (each with a hint saying where it appears), is a code map (`PAGES`, `SECTIONS` in `features/site/types.ts`): page composition is Next.js code; the copy is content. A section owned by another editor (contact) appears as a link, and the action rejects it. All copy is plain text rendered as text nodes. The index flags a page with no SEO description yet. Home's sections (`featured`, `toolkit`, `cta`, added in 5C by migration `0011`, enum values only) are seeded for new databases; an existing database has no rows until the first Home save, so the components fall back to `home.*` UI copy through `sectionOr` (`features/site/types.ts`). A new enum value can't be used in the migration run that adds it (Drizzle applies pending migrations in one transaction), which is why there is no data migration.

**Resume** (`/admin/resume`; `features/resume`).
- *Versions.* Each upload is a `resume_versions` row plus one object in the **private** Blob store at a server-built pathname (`resumes/<uuid>.pdf`). The database stores the pathname, never a URL; no Blob URL or credential ever reaches a browser. The list is newest first, with label (admin-only, editable), sanitized file name, size, upload time and uploader, and Published/Private status.
- *Publication.* An explicit pointer, never "latest upload": `is_published` with a partial unique index, so Postgres allows at most one. Uploading never publishes. Publish (one `withTransaction`: clear, then set) works for any version, including older ones; Unpublish leaves none, and the public page then says the resume is being updated (UI copy). Publish/Unpublish/Delete are Server Actions that `updateTag('resume')`.
- *Delete.* Only unpublished versions, in one `DELETE … WHERE NOT is_published` statement (nothing can publish in between), then the file is removed best-effort (a failure is logged as an orphan). The published version can't be deleted: publish another or unpublish first.
- *Upload* (`POST /api/admin/resume`, `adminRoute`). 4 MB limit; the bytes must be a complete PDF (`%PDF-` header and `%%EOF` trailer, `lib/pdf-file.ts`), whatever the client's name or MIME type says. File first, then row; a failed insert deletes the file again. Shared request plumbing: `lib/cms/upload.ts` (projects use it too).
- *Delivery.* Two Route Handlers, both reading through `features/resume/delivery.ts` and **streaming** the bytes (no redirect to Blob):
  - `GET /api/admin/resume/[id]` (`adminRoute`): any version, admin only, `private, no-store`; `?download=1` for an attachment. Unknown, deleted, or missing-file versions get the same 404 as an outsider.
  - `GET /resume.pdf` (public, outside the proxy matcher): the published version only, because the route takes no id at all. Otherwise 404. `public, s-maxage=300`. Pages link it as `/resume.pdf?v=<id prefix>` (from the `resume`-tagged `getPublishedResume()`), so a new publication is never served from a stale CDN entry; the bare URL is stable for sharing and catches up within 5 minutes.
- *Page 1 only.* `ResumeViewer` draws page 1 to a canvas with pdf.js, not the browser's PDF viewer (an iframe `#page=1` still lets a visitor scroll every page). pdf.js fetches the whole published file, which is intended: Download serves the same file in full. Historical versions are never reachable from the public site.
- `DocumentStore` (`integrations/blob/private-store.ts`) passes the `PRIVATE_BLOB_*` credentials explicitly (the store is connected with that env prefix) and refuses pathnames outside `resumes/`. Services take it as a parameter, so tests substitute it.

**Headshot** (`/admin/profile/headshot`; `profile.headshot_asset_id` → `media_assets`). The photo used by the hero, every share card, and the JSON-LD person. Choosing a new photo and editing its alt text are one form: Save uploads the file with the alt text (`POST /api/admin/profile/headshot`, `adminRoute`) or, with no new file, saves the alt text alone (Server Action). Uploads go to `profile/headshot/<uuid>` in Blob and are JPEG or PNG only (sniffed), because the share-card renderer can't decode WebP or AVIF. Remove (confirmed) clears the photo; the hero and cards then show initials. The seeded photo is a static asset under `public/assets`; replacing it deletes its row, never the file. Every write refreshes the `profile` tag, which the share cards also use.

**Configuration vs Profile.** Configuration owns `site_settings` only: brand mark, monogram, GitHub username and section switch, default theme. Personal content is Profile. Social links, contact copy, and page/section copy have their own editors (above); every content domain has exactly one owner.

## Public experience

- **Home** (`app/(site)/page.tsx`): the Hero (admin headshot, initials fallback), then three short sections:
  - *Selected work* (`FeaturedWork`): the first three featured published projects in CMS order as `ProjectCard layout="tile"`, linking to their case studies. Omitted when nothing is featured.
  - *Toolkit* (`Toolkit`): the stack categories as a hairline list, beside a small `GithubPulse` card (contributions, public repositories, last activity) streamed in `<Suspense>`. The pulse reads the same cached `getGithubOverview` as the Projects page, so it adds no GitHub requests, and it renders nothing when GitHub is off or down.
  - *Closing band* (`ClosingBand`): one line and links to contact, experience, and resume.
- **Projects index**: `Projects` server-renders every card, and `ProjectExplorer` (client) only chooses which to show:
  - search over name, tagline, summary, and technologies (case- and accent-insensitive)
  - technology chips (every technology a published project uses, with counts; a project must match all selected)
  - a Live toggle (`isLive` is the only project status besides publication)
  - Clear, an announced result count, and an empty state
  - Filters live in the URL (`?q=&tech=a,b&live=1`), read after mount so the page stays prerendered, and written with `history.replaceState`. The matching logic is pure and unit-tested (`features/projects/filter.ts`).
- **Skills ↔ projects**: `technologyUsage` (`features/projects/technologies.ts`) counts published projects per technology from `project_technologies`; there is no second mapping. `TechTags` links a used technology to `/projects?tech=<slug>` with its count, and leaves unused ones as plain text (About's Stack, Home's Toolkit). Experience tags are free text and stay plain: no employer–project relationship is implied.
- **Loading**:
  - *Mechanism.* An inline `<head>` script (`lib/splash-script.ts`) decides once per browser session whether a load gets the loading screen (`Splash`) or only the top boot bar. It drives `--boot` (0–100) on `<html>` every frame and sets `data-booted`; the CSS in `system.css` does the rest.
  - *Honest progress.* The value never passes what has really loaded (parsed 45, fonts 72/88, all 100). Between milestones it creeps toward the next one. On the loading screen the count also waits at 0 for 250ms (until the mark, bar, and label are in) and then follows a minimum pace (eased, about 1.1s), so even a fast load shows the whole climb.
  - *Finish.* At 100% the script sets `data-boot-done`: a soft brass flash (fill tint, glow on the unclipped `.splash-bar` via `drop-shadow`, one glint, brass percentage, accent halo bloom), delayed 140ms so the displayed bar is full first. The screen starts dissolving at the flash's peak (340ms hold), so the flash is the ending rather than something followed by a wait. Then the chrome fades in and the hero's staggered reveals (held until boot) play in view. Fast load: about 1.7s to the dissolve. Reduced motion keeps a static brass "done" state.
  - *Scrolling.* Wheel, touch, and scroll keys are blocked while the screen is up, and the listeners are removed on boot. It does not use `overflow: hidden`, which would remove the scrollbar and shift the page sideways when it returned.
  - *Failsafes.* Progress completes at 8s, the scroll block lifts at 10s, and a CSS animation removes the screen at 10s.
  - *Tests.* `splash-script.test.ts` runs the real script against a simulated clock.
- **Back to top**: a glass pill with a reading-progress ring (`--progress`, whole-percent steps from the existing rAF/ResizeObserver update) and a short label from `sm`. It respects the safe area on every side, is `inert` while hidden, uses an instant jump under reduced motion, and moves focus to `#main`.

## Language and SEO

- **English only.** The site has one language. `<html lang="en">`, `Intl` formatting (`INTL_LOCALE`), and Open Graph (`OG_LOCALE`) all come from `config/site.ts`. Content has one canonical representation in the database (see **Domain model**); UI chrome is `config/copy.ts`, imported directly where it's used. Ordinary Unicode (accents, names, any language's words) is just text.
- **Routes.** Public pages live in `app/(site)` at their own URLs; there is no locale segment, rewrite, or cookie. The retired Spanish URLs answer with a permanent redirect to the English page, query string kept: `proxy.ts` sends `/es`, `/es/…`, and the old `/en/…` form to the remaining path (`lib/legacy-locale.ts`, which also collapses leading slashes so the target is always a path on this site), and `next.config.ts` redirects old share-card URLs (`/og/es/…`, `/og/en/…`) to `/og/…`. Unknown paths still reach the `[...rest]` catch-all and get the real 404.
- **Not a requirement.** Multilingual support is out of scope. If it ever comes back, it should be its own initiative that keeps English as the source of truth (e.g. translations derived from or tracked against the English text), not a second hand-maintained copy of every field.
- Dates come from real values formatted with `Intl` (`features/experience/format.ts`, `features/projects/format.ts`).
- SEO (`lib/seo`):
  - `pageMetadata` builds a page's whole metadata: the canonical URL, Open Graph (site name, `en_US`, card image) and Twitter (card image with alt). No `hreflang` alternates. It is built whole because Next.js replaces nested objects like `openGraph` instead of merging them with the layout's. Social titles carry "— Name" (the `<title>` template doesn't reach them).
  - `resolvePageSeo(page)` is the one source for a top-level page's title and description (database copy, else fallbacks), used by both `<head>` and the page's JSON-LD.
  - JSON-LD: Person + WebSite in the layout; a page node per page; `SoftwareSourceCode` per project (`@id` `<url>#project`, cover image, primary repository). Media URLs go through `absoluteMediaUrl`, so absolute Blob URLs (the uploaded headshot) are never prefixed with the site URL.
  - Sitemap (`lib/seo/sitemap.ts`): one canonical URL per page, published projects only (`listPublishedProjectSitemap`; retired slugs and drafts never appear). `lastModified` only from real timestamps: a project's newest of `projects.updated_at` (every editor save touches the row) and its sections'/milestones' `updated_at`; `/projects` takes the newest project; other pages have none. No priority/changefreq.
  - `robots.txt` disallows `/admin` and `/api/` as a crawl hint only; access control is `server/auth`, and admin responses also send `X-Robots-Tag: noindex` (`next.config.ts`). The 404 and error boundaries render `noindex`.
- Share cards (`lib/seo/share-card`, served by `app/og/[...card]`). Every page's Open Graph and Twitter image is a generated 1200×630 PNG: `/og/home.png`, `/og/about.png`, `/og/projects/<slug>.png` (`shareCardPath` in `config/site.ts`, set by `pageMetadata`). The `.png` extension keeps these URLs out of the proxy. Cards are built from live content (profile, page and section copy, projects) and cached with the `profile`/`site`/`projects` tags, so admin saves refresh them; the response's CDN lifetime is 5 minutes.
  - Rendering is `next/og` (Satori): flexbox and inline styles, no `oklch()` (`palette.ts` converts the dark-theme tokens to hex), no `inset` shorthand, no `backdrop-filter`. Display-face strings go through `unlig` (Space Grotesk's tt/ft ligatures otherwise leave a gap). Text is clipped to character budgets so content can't overflow.
  - Fonts are static TTFs in `src/assets/fonts` (OFL; Satori reads neither WOFF2 nor variable fonts). They and `public/assets` (the headshot) are traced into the route by `outputFileTracingIncludes`.
  - Images: PNG and JPEG only (sniffed). The headshot upload accepts only those; a WebP/AVIF project cover falls back to the identity art, and a missing headshot shows initials.
  - Text: typical copy is shown in full; font sizes step down by length (`sizeFor`) and lines wrap. Only text past a generous safety budget (`clip`) is cut with an ellipsis.
  - Content: `cardInputs` (`inputs.ts`) collects everything a card shows (profile and headshot, site brand mark and monogram, page and section copy, project name, tagline, technologies, cover, live flag) as plain data. It is the single source for both the PNG (`render.tsx`) and the card's **version**: `shareCardVersion` hashes those inputs (image by URL; uploads always get a new URL). Pages put it on the image URL (`/og/about.png?v=<hash>`; the route ignores the query), so any admin edit to something a card shows changes the URL in the regenerated `<head>`, and social platforms, which cache scraped images per URL, fetch the new card. Both are cached under `profile`/`site`/`projects`, the tags every writer of those inputs refreshes (profile and headshot, configuration, page and contact copy, every project save, technology renames). The home card shows the person (profile and hero copy), as the home page does; the home SEO title and description stay in `<head>`.

## Integrations

**GitHub** (`integrations/github` → `features/github`)
- The client validates every response with Zod and raises a typed `GithubError` (`rate-limited`, `not-found`, …).
- `getGithubOverview()` loads the profile, repositories, events, and contribution calendar **independently** (`Promise.allSettled`). Each part degrades on its own, and a degraded result is cached for only 60 seconds.
- Pure logic, unit-tested:
  - `calendar.ts` builds a week-aligned 26×7 grid anchored on GitHub's "today".
  - `events.ts` normalizes events into records that the UI describes (`describeActivity`).
  - `summarizeRepos` derives every stat from the same non-fork set.
- The username is a site setting (`site_settings.github_username`); only the token is an env var. `GITHUB_TOKEN` is optional: without it the sections render their fallback and the build logs a `GitHub integration not configured` warning. Use a fine-grained token with *Public repositories (read-only)*; the app enforces public-only regardless.
- The client (`integrations/github/client.ts`) requests only `api.github.com`, on paths built from validated owner/name segments or a numeric id, never from a URL someone typed (no SSRF). Status handling: 429, or 403 with `x-ratelimit-remaining: 0` / `retry-after` → `rate-limited`; any other 403 or 451 → `forbidden`; 404/410 → `not-found`; 202 → `pending`; 204 and 409 (empty repository) → `empty`; 8 s timeout; Zod-validated bodies.
- GitHub *enriches* the portfolio but never defines a project, and a project page never depends on it.

**Project analytics** (Phase 5B: `features/github/{repo-data,project,project-analytics}.ts`, `components/ProjectGithubSection`)
- *Data flow.* page → `ProjectGithubSection` (inside `<Suspense>`) → `getProjectGithub(refs)` (cached composer) → one cached loader per repository and resource (`repo-data.ts`) → client. Loaders are keyed by repository (`id:<github id>`, else `name:owner/name`; resources by canonical full name), so every page and project showing a repository shares one set of requests. Metadata comes first: nothing else is requested for a repository that isn't public.
- *Privacy.* A repository whose metadata says `private` or a non-public `visibility` becomes a contentless `private` state: no name, stats, or error detail is cached or rendered; it only counts toward "N linked repositories are unavailable". Draft releases are dropped (a token with push access sees them). GitHub text renders as React text nodes; external links open in a new tab with `noopener noreferrer`. With analytics on, the metadata panel drops its repository links, because the section lists only verified-public repositories.
- *Metric definitions* (`project-analytics.ts`, unit-tested):

  | Metric | Definition |
  |---|---|
  | Repositories, stars, forks | distinct public repositories by GitHub id; sums |
  | Commits | default-branch commits per week from `GET /stats/commit_activity` (GitHub-computed, the last 52 weeks), summed over the weeks **every** covered repository reports, so the period is identical for all. Labeled as a past-year, time-bounded count, never a lifetime total. Rewritten history (force pushes) is reflected when GitHub recomputes |
  | Contributors | distinct GitHub accounts (user id) from `/contributors`, contributions summed, `type: Bot` excluded; commits not linked to an account aren't counted, and GitHub lists at most 500 per repository |
  | Languages | Linguist bytes per language summed across repositories, then shares; top 6 + Other |
  | Releases | published (non-draft) releases from the latest 100 per repository; "100+" when a page is full |
  | Recent commits | newest default-branch commits (10 per repository), merged newest first, deduplicated by SHA, 8 shown |
  | Last activity | newest default-branch commit or published release |

  A combined figure whose inputs only partly loaded says "Based on N of M repositories"; a part that didn't load is `null` and hidden, never a 0.
- *Freshness* (`CACHE_LIFE`, revalidate): metadata 6 h, commits 30 min, commit activity 2 h, languages 24 h, contributors 24 h, releases 6 h, each expiring after 7 days; the composer 15 min (explicit, so inner lifetimes don't leak), or `githubDegraded` (1 min) when anything failed or is still computing.
- *Failure contract.* Loaders never throw. Definitive answers (not found, private, empty) are values cached for the resource's lifetime. Transient failures (rate limit, outage, timeout, malformed body, 202 still computing) come back as `{ ok: false }` (`Loaded<T>`), cached for one minute (`githubDegraded`), so they retry soon. They must not throw: an error thrown inside `'use cache'` fails the page's prerender even when the caller catches it. That broke a production deployment while GitHub was still computing a repository's statistics. The composer degrades per part, and a composed result with any failure is itself cached for a minute. With no data at all, the section shows its unavailable state and the page is unaffected. The trade-off: an outage longer than a resource's lifetime shows the degraded state instead of the last good data. Nothing is snapshotted in Postgres and nothing syncs in the background.
- *Global section* (`overview.ts`) keeps its own rules (all of the user's own public repositories; events plus commits) and shares the client, its error handling, and the language colors.

**Resend / contact** (`features/contact` → `integrations/resend`)
- One Zod schema (`contact/schema.ts`) validates in the browser for instant feedback and again in the Server Action, which is the trust boundary. Errors are keys into the UI copy (`contact.errors`), so the action returns codes and the form owns the wording.
- The Server Action works without JavaScript (`useActionState`). It also handles the honeypot, rejects header injection, HTML-escapes the email body, and sends the visitor's address as Reply-To (never From).
- Secrets and addresses are read only in `integrations/resend/client.ts` through `config/env.ts`.

**Observability.** `lib/logger.ts` writes one structured JSON line per event (`scope`, `level`). Integrations log their failures there. It's the single place to attach an error-reporting service later.

## Future insertion points

- **A new admin-managed domain** copies the shape in **Content management**: schema → repository (editor reads + writes) → `service.ts` → `mutations.ts` → editor → console page, with `authorship` columns and a migration in the same change, an `ADMIN_NAV` entry, and a cache tag.
- **Other images**: reuse `ImageUploadField` (its `types` prop narrows formats)/`sendUpload`, `lib/image-file.ts`, `lib/cms/upload.ts`, `MediaStore`, `db/media.ts` (and add any new referencing column to `deleteUnreferencedAssets`), and `lib/cms/media-files.ts`; `media_assets` rows stay behind `resolveMedia`. The headshot is the smallest example.
- **Cleanup:** drop the deprecated `profile.resume_asset_id` (and its orphaned `media_assets` row) in a later migration, once no deployment reads it.
- **Public API (Phase 5):** `app/api/v1/*` route handlers calling the same `queries.ts` and mapping domain types to versioned DTOs. Nothing in the domain layer depends on HTTP. Writes, if ever exposed, call the same `service.ts` functions behind their own authorization (each service already takes an `actor` and, for files, a store).
- **SDLC Manager (Phase 6):**
  - Sync goes through the domain mutations, never straight to tables or UI.
  - Store external links and synced fields in a dedicated table (e.g. `project_sources`: project id, source, external id, synced-at).
  - Portfolio-owned fields (status, featured, order, media, copy) stay authoritative and are never overwritten by sync.

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
- **Glass budget.** Command bar, drawer, palette, back-to-top pill, hero portrait, featured project cards, data panels (snapshot, contributions, project commit activity, the home GitHub pulse), project metadata, resume header, contact form, current role. Lists, timelines, and stacks use hairlines and type instead of boxes.
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

- **Vite SPA, React Router, and the client-only context.** Replaced by the Next.js App Router with Server Components and the Metadata API. Pages are now server-rendered and indexable.
- **`siteData.js` / `siteStrings.js`** (content duplicated per language). Replaced by the Neon domain model plus typed UI copy.
- **`api/github.js`, `api/contact.js`, the CORS allowlist, `VITE_API_BASE_URL`, and the `api.alexball.dev` API portal.** Replaced by in-process cached services and a Server Action. The subdomain now redirects to the main site.
- **The `scrollWatcher` singleton and `window.__animReady` global.** Replaced by one shared IntersectionObserver hook.
- **Build-time JSON-LD injection and runtime `<head>` mutation.** Replaced by server-rendered metadata and JSON-LD.
- **The static `sitemap.xml`, `robots.txt`, and `site.webmanifest`.** Replaced by generated `app/sitemap.ts`, `app/robots.ts`, and `app/manifest.ts`.
