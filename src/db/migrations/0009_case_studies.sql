CREATE TYPE "public"."milestone_date_precision" AS ENUM('day', 'month', 'year');--> statement-breakpoint
CREATE TYPE "public"."milestone_kind" AS ENUM('started', 'feature', 'release', 'launch', 'refactor', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_section_kind" AS ENUM('narrative', 'highlights', 'architecture', 'challenges', 'lessons', 'outcomes', 'gallery', 'video');--> statement-breakpoint
CREATE TABLE "project_milestone_translations" (
	"milestone_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	CONSTRAINT "project_milestone_translations_milestone_id_locale_pk" PRIMARY KEY("milestone_id","locale")
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"occurred_on" date NOT NULL,
	"date_precision" "milestone_date_precision" DEFAULT 'month' NOT NULL,
	"kind" "milestone_kind" DEFAULT 'other' NOT NULL,
	"url" text,
	"asset_id" uuid,
	"visible" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "project_relations" (
	"project_id" uuid NOT NULL,
	"related_project_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "project_relations_project_id_related_project_id_pk" PRIMARY KEY("project_id","related_project_id"),
	CONSTRAINT "project_relations_not_self" CHECK ("project_relations"."project_id" <> "project_relations"."related_project_id")
);
--> statement-breakpoint
CREATE TABLE "project_section_item_translations" (
	"item_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	CONSTRAINT "project_section_item_translations_item_id_locale_pk" PRIMARY KEY("item_id","locale")
);
--> statement-breakpoint
CREATE TABLE "project_section_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_section_media" (
	"section_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "project_section_media_section_id_asset_id_pk" PRIMARY KEY("section_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "project_section_translations" (
	"section_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"heading" text NOT NULL,
	"body" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "project_section_translations_section_id_locale_pk" PRIMARY KEY("section_id","locale")
);
--> statement-breakpoint
CREATE TABLE "project_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "project_section_kind" NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"video_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "project_milestone_translations" ADD CONSTRAINT "project_milestone_translations_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_relations" ADD CONSTRAINT "project_relations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_relations" ADD CONSTRAINT "project_relations_related_project_id_projects_id_fk" FOREIGN KEY ("related_project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_section_item_translations" ADD CONSTRAINT "project_section_item_translations_item_id_project_section_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."project_section_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_section_items" ADD CONSTRAINT "project_section_items_section_id_project_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."project_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_section_media" ADD CONSTRAINT "project_section_media_section_id_project_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."project_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_section_media" ADD CONSTRAINT "project_section_media_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_section_translations" ADD CONSTRAINT "project_section_translations_section_id_project_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."project_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sections" ADD CONSTRAINT "project_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_milestones_project_date_idx" ON "project_milestones" USING btree ("project_id","occurred_on");--> statement-breakpoint
CREATE INDEX "project_relations_related_idx" ON "project_relations" USING btree ("related_project_id");--> statement-breakpoint
CREATE INDEX "project_section_items_section_idx" ON "project_section_items" USING btree ("section_id","sort_order");--> statement-breakpoint
CREATE INDEX "project_section_media_asset_idx" ON "project_section_media" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "project_sections_project_sort_idx" ON "project_sections" USING btree ("project_id","sort_order");