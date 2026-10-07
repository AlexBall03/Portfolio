-- Switch the "projects" and "technologies" snapshot metrics to derived values
-- and relabel them to match what is now counted. Idempotent: on a database
-- that already has these values (or a new one seeded afterwards) it changes nothing.
UPDATE "snapshot_metrics" SET "source" = 'published_projects' WHERE "icon" = 'cube' AND "source" = 'static';--> statement-breakpoint
UPDATE "snapshot_metrics" SET "source" = 'technologies' WHERE "icon" = 'layers' AND "source" = 'static';--> statement-breakpoint
UPDATE "snapshot_metric_translations" AS t
SET "label" = v.label, "note" = v.note
FROM "snapshot_metrics" AS m,
  (VALUES
    ('published_projects', 'en', 'Published Projects', 'in this portfolio'),
    ('published_projects', 'es', 'Proyectos Publicados', 'en este portafolio'),
    ('technologies', 'en', 'Core Technologies', 'in my current stack'),
    ('technologies', 'es', 'Tecnologías Principales', 'en mi stack actual')
  ) AS v(source, locale, label, note)
WHERE t."metric_id" = m."id"
  AND m."source"::text = v.source
  AND t."locale"::text = v.locale;
