-- Secondary section headings move from the UI dictionaries into section_content.
-- Only rows that already exist are touched; a database without them keeps the
-- heading hidden until it is set from /admin/content.
UPDATE "section_content" SET "aside" = 'Beyond the code' WHERE "section_key" = 'about' AND "locale" = 'en' AND "aside" IS NULL;--> statement-breakpoint
UPDATE "section_content" SET "aside" = 'Más allá del código' WHERE "section_key" = 'about' AND "locale" = 'es' AND "aside" IS NULL;--> statement-breakpoint
UPDATE "section_content" SET "aside" = 'Looking Ahead' WHERE "section_key" = 'stack' AND "locale" = 'en' AND "aside" IS NULL;--> statement-breakpoint
UPDATE "section_content" SET "aside" = 'Mirando Hacia Adelante' WHERE "section_key" = 'stack' AND "locale" = 'es' AND "aside" IS NULL;
