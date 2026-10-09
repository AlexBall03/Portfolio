-- English-only content. Each *_translations table is folded into its parent
-- table as plain columns, then dropped together with the `locale` enum.
--
-- Data preservation: every parent row takes its English translation; only a
-- row with no English translation takes another one, which is exactly what
-- English visitors were already shown (the old read-time fallback). Spanish
-- text is the only thing removed. All statements run in one transaction.

-- 1. New columns. NOT NULL text starts with a temporary '' default so existing
--    rows stay valid until step 2 fills them; step 3 removes those defaults.
ALTER TABLE "media_assets" ADD COLUMN "alt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "skill_categories" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "project_section_items" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_section_items" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "project_sections" ADD COLUMN "heading" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_sections" ADD COLUMN "body" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tagline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "body" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "organization_label" text;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "role" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "employment_type" text;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "summary" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "statement" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "availability_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "location_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "about" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "hero_focus" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "hero_stack_line" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "hero_chips" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_highlights" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_highlights" ADD COLUMN "body" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_roles" ADD COLUMN "label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "snapshot_metrics" ADD COLUMN "label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "snapshot_metrics" ADD COLUMN "note" text DEFAULT '' NOT NULL;--> statement-breakpoint

-- 2. Copy: per entity, the English row, else the first other row.
UPDATE "media_assets" p SET "alt" = t."alt", "caption" = t."caption"
FROM (SELECT DISTINCT ON ("asset_id") * FROM "media_asset_translations" ORDER BY "asset_id", ("locale" <> 'en'), "locale") t
WHERE t."asset_id" = p."id";--> statement-breakpoint
UPDATE "skill_categories" p SET "name" = t."name"
FROM (SELECT DISTINCT ON ("category_id") * FROM "skill_category_translations" ORDER BY "category_id", ("locale" <> 'en'), "locale") t
WHERE t."category_id" = p."id";--> statement-breakpoint
UPDATE "project_milestones" p SET "title" = t."title", "description" = t."description"
FROM (SELECT DISTINCT ON ("milestone_id") * FROM "project_milestone_translations" ORDER BY "milestone_id", ("locale" <> 'en'), "locale") t
WHERE t."milestone_id" = p."id";--> statement-breakpoint
UPDATE "project_section_items" p SET "title" = t."title", "body" = t."body"
FROM (SELECT DISTINCT ON ("item_id") * FROM "project_section_item_translations" ORDER BY "item_id", ("locale" <> 'en'), "locale") t
WHERE t."item_id" = p."id";--> statement-breakpoint
UPDATE "project_sections" p SET "heading" = t."heading", "body" = t."body"
FROM (SELECT DISTINCT ON ("section_id") * FROM "project_section_translations" ORDER BY "section_id", ("locale" <> 'en'), "locale") t
WHERE t."section_id" = p."id";--> statement-breakpoint
UPDATE "projects" p SET "name" = t."name", "tagline" = t."tagline", "summary" = t."summary", "body" = t."body"
FROM (SELECT DISTINCT ON ("project_id") * FROM "project_translations" ORDER BY "project_id", ("locale" <> 'en'), "locale") t
WHERE t."project_id" = p."id";--> statement-breakpoint
UPDATE "experiences" p SET "organization_label" = t."organization_label", "role" = t."role", "employment_type" = t."employment_type",
  "location" = t."location", "summary" = t."summary", "tags" = t."tags"
FROM (SELECT DISTINCT ON ("experience_id") * FROM "experience_translations" ORDER BY "experience_id", ("locale" <> 'en'), "locale") t
WHERE t."experience_id" = p."id";--> statement-breakpoint
UPDATE "profile" p SET "title" = t."title", "statement" = t."statement", "availability_text" = t."availability_text",
  "location_label" = t."location_label", "about" = t."about", "hero_focus" = t."hero_focus",
  "hero_stack_line" = t."hero_stack_line", "hero_chips" = t."hero_chips"
FROM (SELECT DISTINCT ON ("profile_id") * FROM "profile_translations" ORDER BY "profile_id", ("locale" <> 'en'), "locale") t
WHERE t."profile_id" = p."id";--> statement-breakpoint
UPDATE "profile_highlights" p SET "title" = t."title", "body" = t."body"
FROM (SELECT DISTINCT ON ("highlight_id") * FROM "profile_highlight_translations" ORDER BY "highlight_id", ("locale" <> 'en'), "locale") t
WHERE t."highlight_id" = p."id";--> statement-breakpoint
UPDATE "profile_roles" p SET "label" = t."label"
FROM (SELECT DISTINCT ON ("role_id") * FROM "profile_role_translations" ORDER BY "role_id", ("locale" <> 'en'), "locale") t
WHERE t."role_id" = p."id";--> statement-breakpoint
UPDATE "snapshot_metrics" p SET "label" = t."label", "note" = t."note"
FROM (SELECT DISTINCT ON ("metric_id") * FROM "snapshot_metric_translations" ORDER BY "metric_id", ("locale" <> 'en'), "locale") t
WHERE t."metric_id" = p."id";--> statement-breakpoint

-- 3. Remove the temporary defaults (the schema has none for these columns).
ALTER TABLE "media_assets" ALTER COLUMN "alt" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "skill_categories" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project_milestones" ALTER COLUMN "title" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project_section_items" ALTER COLUMN "title" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project_sections" ALTER COLUMN "heading" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "tagline" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "summary" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "experiences" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "title" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "statement" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "availability_text" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "location_label" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "hero_focus" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "hero_stack_line" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile_highlights" ALTER COLUMN "title" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile_highlights" ALTER COLUMN "body" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile_roles" ALTER COLUMN "label" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "snapshot_metrics" ALTER COLUMN "label" DROP DEFAULT;--> statement-breakpoint

-- 4. Page and section copy: one row per key. A Spanish row is removed only
--    when its key has an English row; a key with no English row keeps its
--    only row (again, what English visitors were already shown).
DELETE FROM "page_content" c WHERE c."locale" <> 'en'
  AND EXISTS (SELECT 1 FROM "page_content" e WHERE e."page_key" = c."page_key" AND e."locale" = 'en');--> statement-breakpoint
DELETE FROM "section_content" c WHERE c."locale" <> 'en'
  AND EXISTS (SELECT 1 FROM "section_content" e WHERE e."section_key" = c."section_key" AND e."locale" = 'en');--> statement-breakpoint
ALTER TABLE "page_content" DROP CONSTRAINT "page_content_page_key_locale_pk";--> statement-breakpoint
ALTER TABLE "section_content" DROP CONSTRAINT "section_content_section_key_locale_pk";--> statement-breakpoint
ALTER TABLE "page_content" DROP COLUMN "locale";--> statement-breakpoint
ALTER TABLE "section_content" DROP COLUMN "locale";--> statement-breakpoint
ALTER TABLE "page_content" ADD PRIMARY KEY ("page_key");--> statement-breakpoint
ALTER TABLE "section_content" ADD PRIMARY KEY ("section_key");--> statement-breakpoint

-- 5. The translation tables and the locale type.
DROP TABLE "media_asset_translations";--> statement-breakpoint
DROP TABLE "skill_category_translations";--> statement-breakpoint
DROP TABLE "project_milestone_translations";--> statement-breakpoint
DROP TABLE "project_section_item_translations";--> statement-breakpoint
DROP TABLE "project_section_translations";--> statement-breakpoint
DROP TABLE "project_translations";--> statement-breakpoint
DROP TABLE "experience_translations";--> statement-breakpoint
DROP TABLE "profile_highlight_translations";--> statement-breakpoint
DROP TABLE "profile_role_translations";--> statement-breakpoint
DROP TABLE "profile_translations";--> statement-breakpoint
DROP TABLE "snapshot_metric_translations";--> statement-breakpoint
DROP TYPE "public"."locale";
