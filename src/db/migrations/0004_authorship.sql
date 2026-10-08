ALTER TABLE "profile" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "profile_highlights" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "profile_highlights" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "profile_roles" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "profile_roles" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "snapshot_metrics" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "snapshot_metrics" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "updated_by" text;