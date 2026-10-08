import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { authorship, localeEnum, timestamps } from './_shared';

/**
 * Where an asset's bytes live. `static` = a path under /public, `blob` = an
 * uploaded file in Vercel Blob (public store), `external` = any absolute URL.
 * Consumers only ever see a resolved `src`, so storage can change per asset.
 */
export const mediaStorageEnum = pgEnum('media_storage', ['static', 'blob', 'external']);

export const mediaAssets = pgTable('media_assets', {
  id: uuid().primaryKey().defaultRandom(),
  storage: mediaStorageEnum().notNull(),
  /** `/assets/x.png` for static assets, an absolute URL otherwise. */
  src: text().notNull(),
  mimeType: text(),
  width: integer(),
  height: integer(),
  ...timestamps,
  ...authorship,
});

export const mediaAssetTranslations = pgTable(
  'media_asset_translations',
  {
    assetId: uuid()
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    locale: localeEnum().notNull(),
    alt: text().notNull(),
    /** Optional caption, shown with the image where the layout has room for one. */
    caption: text(),
  },
  (t) => [primaryKey({ columns: [t.assetId, t.locale] })],
);

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  translations: many(mediaAssetTranslations),
}));

export const mediaAssetTranslationsRelations = relations(mediaAssetTranslations, ({ one }) => ({
  asset: one(mediaAssets, { fields: [mediaAssetTranslations.assetId], references: [mediaAssets.id] }),
}));
