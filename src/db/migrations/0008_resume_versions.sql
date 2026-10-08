CREATE TABLE "resume_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pathname" text NOT NULL,
	"file_name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"label" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "resume_versions_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "resume_versions_one_published" ON "resume_versions" USING btree ("is_published") WHERE "resume_versions"."is_published";