-- Extiende nodes para coincidir con la app (slug, capas root/locked, etc.)
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS origin_pos_x REAL;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS origin_pos_y REAL;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_layer_check;
ALTER TABLE nodes ADD CONSTRAINT nodes_layer_check
  CHECK (layer IN ('custom', 'guide', 'root', 'locked', 'wildcard', 'dormant'));

CREATE INDEX IF NOT EXISTS idx_nodes_auth_slug ON nodes(auth_id, slug);
