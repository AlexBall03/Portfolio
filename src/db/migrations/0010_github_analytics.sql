CREATE TYPE "public"."repository_label" AS ENUM('frontend', 'backend', 'api', 'infrastructure', 'mobile', 'library', 'docs', 'other');--> statement-breakpoint
ALTER TABLE "project_repositories" ADD COLUMN "github_id" bigint;--> statement-breakpoint
ALTER TABLE "project_repositories" ADD COLUMN "label" "repository_label";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_analytics_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_repositories_github_id_idx" ON "project_repositories" USING btree ("project_id","github_id") WHERE "project_repositories"."github_id" is not null;