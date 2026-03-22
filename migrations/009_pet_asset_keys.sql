PRAGMA foreign_keys = ON;

ALTER TABLE pets ADD COLUMN asset_key TEXT NOT NULL DEFAULT 'cat-default';

CREATE INDEX IF NOT EXISTS idx_pets_asset_key ON pets(asset_key);
