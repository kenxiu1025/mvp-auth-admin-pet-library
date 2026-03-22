PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pet_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pet_asset_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_asset_id INTEGER NOT NULL,
  state_key TEXT NOT NULL CHECK(state_key IN ('calm', 'happy', 'hungry', 'angry', 'sleepy', 'excited')),
  image_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pet_asset_id, state_key),
  FOREIGN KEY (pet_asset_id) REFERENCES pet_assets(id) ON DELETE CASCADE
);

ALTER TABLE pets ADD COLUMN selected_pet_asset_id INTEGER REFERENCES pet_assets(id);

CREATE INDEX IF NOT EXISTS idx_pet_assets_species_active ON pet_assets(species, is_active);
CREATE INDEX IF NOT EXISTS idx_pet_asset_states_asset ON pet_asset_states(pet_asset_id, state_key);
CREATE INDEX IF NOT EXISTS idx_pets_selected_asset ON pets(selected_pet_asset_id);

INSERT INTO pet_assets (key, name, species, is_active, created_at)
VALUES
  ('cat-default', '預設貓咪', 'cat', 1, CURRENT_TIMESTAMP),
  ('white-cat', '白貓', 'cat', 1, CURRENT_TIMESTAMP),
  ('tabby-cat', '虎斑貓', 'cat', 1, CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  name = excluded.name,
  species = excluded.species,
  is_active = excluded.is_active;

INSERT INTO pet_asset_states (pet_asset_id, state_key, image_path, created_at)
SELECT pet_assets.id, states.state_key, states.image_path, CURRENT_TIMESTAMP
FROM pet_assets
INNER JOIN (
  SELECT 'cat-default' AS asset_key, 'calm' AS state_key, '/pet/cat-default/calm.png' AS image_path
  UNION ALL SELECT 'cat-default', 'happy', '/pet/cat-default/happy.png'
  UNION ALL SELECT 'cat-default', 'hungry', '/pet/cat-default/hungry.png'
  UNION ALL SELECT 'cat-default', 'angry', '/pet/cat-default/angry.png'
  UNION ALL SELECT 'cat-default', 'sleepy', '/pet/cat-default/sleepy.png'
  UNION ALL SELECT 'cat-default', 'excited', '/pet/cat-default/excited.png'
  UNION ALL SELECT 'white-cat', 'calm', '/pet/white-cat/calm.png'
  UNION ALL SELECT 'white-cat', 'happy', '/pet/white-cat/happy.png'
  UNION ALL SELECT 'white-cat', 'hungry', '/pet/white-cat/hungry.png'
  UNION ALL SELECT 'white-cat', 'angry', '/pet/white-cat/angry.png'
  UNION ALL SELECT 'white-cat', 'sleepy', '/pet/white-cat/sleepy.png'
  UNION ALL SELECT 'white-cat', 'excited', '/pet/white-cat/excited.png'
  UNION ALL SELECT 'tabby-cat', 'calm', '/pet/tabby-cat/calm.png'
  UNION ALL SELECT 'tabby-cat', 'happy', '/pet/tabby-cat/happy.png'
  UNION ALL SELECT 'tabby-cat', 'hungry', '/pet/tabby-cat/hungry.png'
  UNION ALL SELECT 'tabby-cat', 'angry', '/pet/tabby-cat/angry.png'
  UNION ALL SELECT 'tabby-cat', 'sleepy', '/pet/tabby-cat/sleepy.png'
  UNION ALL SELECT 'tabby-cat', 'excited', '/pet/tabby-cat/excited.png'
) AS states ON states.asset_key = pet_assets.key
ON CONFLICT(pet_asset_id, state_key) DO UPDATE SET
  image_path = excluded.image_path;

UPDATE pets
SET selected_pet_asset_id = (
  SELECT pet_assets.id
  FROM pet_assets
  WHERE pet_assets.key = pets.asset_key
)
WHERE selected_pet_asset_id IS NULL;

UPDATE pets
SET selected_pet_asset_id = (
  SELECT id
  FROM pet_assets
  WHERE key = 'cat-default'
)
WHERE selected_pet_asset_id IS NULL;
