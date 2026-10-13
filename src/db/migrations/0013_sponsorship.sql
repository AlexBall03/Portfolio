CREATE TYPE "public"."sponsor_sort" AS ENUM('newest', 'oldest', 'alphabetical');--> statement-breakpoint
ALTER TYPE "public"."page_key" ADD VALUE 'support';--> statement-breakpoint
CREATE TABLE "sponsorship_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"show_home_section" boolean DEFAULT true NOT NULL,
	"support_page_enabled" boolean DEFAULT true NOT NULL,
	"heading" text NOT NULL,
	"description" text NOT NULL,
	"cta_label" text NOT NULL,
	"sponsors_url" text NOT NULL,
	"show_sponsors" boolean DEFAULT true NOT NULL,
	"show_sponsor_count" boolean DEFAULT false NOT NULL,
	"home_sponsor_limit" integer DEFAULT 8 NOT NULL,
	"sponsor_sort" "sponsor_sort" DEFAULT 'newest' NOT NULL,
	"hidden_sponsors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"support_title" text NOT NULL,
	"support_intro" text NOT NULL,
	"support_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "sponsorship_settings_singleton" CHECK ("sponsorship_settings"."id" = 1)
);
