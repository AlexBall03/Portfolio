ALTER TABLE "media_asset_translations" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "project_translations" ADD COLUMN "body" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_by" text;--> statement-breakpoint
CREATE UNIQUE INDEX "project_media_one_cover_idx" ON "project_media" USING btree ("project_id") WHERE "project_media"."role" = 'cover';