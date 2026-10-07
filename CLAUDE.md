# alexball.dev

Read `ARCHITECTURE.md` first — it is the map of this codebase (layers, domain model, conventions, future insertion points).

- Next.js 16 App Router with Cache Components. Docs for the installed version: `node_modules/next/dist/docs/`.
- Data flow: `app/[locale]` pages → `features/*/queries.ts` (cached) → `features/*/repository.ts` → `db/`.
- Content lives in Neon (translation tables per locale); UI chrome strings in `src/i18n/dictionaries` (`es` is typed against `en`).
- Validate with `npm run check`. Build locally with `DATABASE_URL=pglite:memory:// npm run build` when no Neon URL is configured.
- Schema change: edit `src/db/schema/*` → `npm run db:generate` → include the SQL in the same change, always; the user never runs migrate or seed commands. `npm run dev` (`predev`) and deployments (`build:deploy`) apply it via `db:prepare`. Keep migrations backward compatible.
- `npm run dev` and `db:prepare` / `db:migrate` / `db:seed` act on the Neon database in `.env.local` (the persistent Neon `dev` branch). Don't run them without being asked; use PGlite for tests and local builds.
- `master` deploys to production; work on `dev`. Never push or merge to `master` without being asked.
