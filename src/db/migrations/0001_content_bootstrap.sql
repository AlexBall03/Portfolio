CREATE TABLE "content_bootstrap" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"source" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_bootstrap_singleton" CHECK ("content_bootstrap"."id" = 1)
);
