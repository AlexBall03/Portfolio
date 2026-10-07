CREATE TYPE "public"."accent" AS ENUM('blue', 'gold');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'es');--> statement-breakpoint
CREATE TYPE "public"."media_storage" AS ENUM('static', 'blob', 'external');--> statement-breakpoint
CREATE TYPE "public"."skill_category_kind" AS ENUM('stack', 'learning');--> statement-breakpoint
CREATE TYPE "public"."project_media_role" AS ENUM('cover', 'gallery');--> statement-breakpoint
CREATE TYPE "public"."repository_provider" AS ENUM('github');--> statement-breakpoint
CREATE TYPE "public"."date_precision" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TYPE "public"."experience_kind" AS ENUM('career', 'education');--> statement-breakpoint
CREATE TYPE "public"."highlight_kind" AS ENUM('differentiator', 'resume');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('github', 'linkedin', 'x', 'youtube', 'instagram', 'website');--> statement-breakpoint
CREATE TYPE "public"."page_key" AS ENUM('home', 'about', 'projects', 'experience', 'resume', 'contact');--> statement-breakpoint
CREATE TYPE "public"."section_key" AS ENUM('snapshot', 'about', 'stack', 'projects', 'github', 'experience', 'resume', 'contact');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('dark', 'light');--> statement-breakpoint
CREATE TABLE "media_asset_translations" (
	"asset_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"alt" text NOT NULL,
	CONSTRAINT "media_asset_translations_asset_id_locale_pk" PRIMARY KEY("asset_id","locale")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage" "media_storage" NOT NULL,
	"src" text NOT NULL,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" "skill_category_kind" DEFAULT 'stack' NOT NULL,
	"icon" text NOT NULL,
	"accent" "accent" DEFAULT 'blue' NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "skill_category_technologies" (
	"category_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "skill_category_technologies_category_id_technology_id_pk" PRIMARY KEY("category_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "skill_category_translations" (
	"category_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "skill_category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale")
);
--> statement-breakpoint
CREATE TABLE "technologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technologies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"project_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" "project_media_role" DEFAULT 'gallery' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "project_media_project_id_asset_id_pk" PRIMARY KEY("project_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "project_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" "repository_provider" DEFAULT 'github' NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_slug_history" (
	"slug" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"retired_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_technologies" (
	"project_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "project_technologies_project_id_technology_id_pk" PRIMARY KEY("project_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "project_translations" (
	"project_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"summary" text NOT NULL,
	CONSTRAINT "project_translations_project_id_locale_pk" PRIMARY KEY("project_id","locale")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"demo_url" text,
	"source_url" text,
	"details_url" text,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "experience_translations" (
	"experience_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"organization_label" text,
	"role" text NOT NULL,
	"employment_type" text,
	"location" text,
	"summary" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "experience_translations_experience_id_locale_pk" PRIMARY KEY("experience_id","locale")
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "experience_kind" NOT NULL,
	"organization" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"date_precision" date_precision DEFAULT 'month' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"full_name" text NOT NULL,
	"short_name" text NOT NULL,
	"email" text NOT NULL,
	"headshot_asset_id" uuid,
	"resume_asset_id" uuid,
	"open_to_work" boolean DEFAULT true NOT NULL,
	"time_zone" text DEFAULT 'America/Phoenix' NOT NULL,
	"address_region" text,
	"address_country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_singleton" CHECK ("profile"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "profile_highlight_translations" (
	"highlight_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	CONSTRAINT "profile_highlight_translations_highlight_id_locale_pk" PRIMARY KEY("highlight_id","locale")
);
--> statement-breakpoint
CREATE TABLE "profile_highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "highlight_kind" NOT NULL,
	"icon" text,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_role_translations" (
	"role_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "profile_role_translations_role_id_locale_pk" PRIMARY KEY("role_id","locale")
);
--> statement-breakpoint
CREATE TABLE "profile_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accent" "accent" DEFAULT 'blue' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_translations" (
	"profile_id" integer NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text NOT NULL,
	"statement" text NOT NULL,
	"availability_text" text NOT NULL,
	"location_label" text NOT NULL,
	"about" text[] DEFAULT '{}' NOT NULL,
	"hero_focus" text NOT NULL,
	"hero_stack_line" text NOT NULL,
	"hero_chips" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "profile_translations_profile_id_locale_pk" PRIMARY KEY("profile_id","locale")
);
--> statement-breakpoint
CREATE TABLE "snapshot_metric_translations" (
	"metric_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"label" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "snapshot_metric_translations_metric_id_locale_pk" PRIMARY KEY("metric_id","locale")
);
--> statement-breakpoint
CREATE TABLE "snapshot_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icon" text NOT NULL,
	"value" double precision NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"accent" "accent" DEFAULT 'blue' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "social_platform" NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"handle" text,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_content" (
	"page_key" "page_key" NOT NULL,
	"locale" "locale" NOT NULL,
	"seo_title" text,
	"seo_description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_content_page_key_locale_pk" PRIMARY KEY("page_key","locale")
);
--> statement-breakpoint
CREATE TABLE "section_content" (
	"section_key" "section_key" NOT NULL,
	"locale" "locale" NOT NULL,
	"eyebrow" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_content_section_key_locale_pk" PRIMARY KEY("section_key","locale")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"brand_mark" text NOT NULL,
	"monogram" text NOT NULL,
	"github_username" text,
	"show_github_section" boolean DEFAULT true NOT NULL,
	"default_theme" "theme" DEFAULT 'dark' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "media_asset_translations" ADD CONSTRAINT "media_asset_translations_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_category_technologies" ADD CONSTRAINT "skill_category_technologies_category_id_skill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_category_technologies" ADD CONSTRAINT "skill_category_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_category_translations" ADD CONSTRAINT "skill_category_translations_category_id_skill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repositories" ADD CONSTRAINT "project_repositories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_slug_history" ADD CONSTRAINT "project_slug_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_translations" ADD CONSTRAINT "project_translations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_translations" ADD CONSTRAINT "experience_translations_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_headshot_asset_id_media_assets_id_fk" FOREIGN KEY ("headshot_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_resume_asset_id_media_assets_id_fk" FOREIGN KEY ("resume_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_highlight_translations" ADD CONSTRAINT "profile_highlight_translations_highlight_id_profile_highlights_id_fk" FOREIGN KEY ("highlight_id") REFERENCES "public"."profile_highlights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_role_translations" ADD CONSTRAINT "profile_role_translations_role_id_profile_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."profile_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_translations" ADD CONSTRAINT "profile_translations_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_metric_translations" ADD CONSTRAINT "snapshot_metric_translations_metric_id_snapshot_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."snapshot_metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_repositories_unique_idx" ON "project_repositories" USING btree ("project_id","provider","owner","name");--> statement-breakpoint
CREATE INDEX "projects_status_sort_idx" ON "projects" USING btree ("status","sort_order");