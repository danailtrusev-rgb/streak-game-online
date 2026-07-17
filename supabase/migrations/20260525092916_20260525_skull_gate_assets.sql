-- Skull Gate Asset Library
-- Adds registry table for reusable Skull Gate scene assets (manual path, no upload).

CREATE TABLE IF NOT EXISTS skull_gate_assets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_path  text        UNIQUE NOT NULL,
  asset_type  text        NOT NULL
              CHECK (asset_type IN (
                'source_plate','background','back_plate','gate_frame',
                'gate_door_left','gate_door_right','inner_light','foreground',
                'object','overlay','effect','particle','flame','button','icon'
              )),
  label       text        NOT NULL DEFAULT '',
  tags        text[]      NOT NULL DEFAULT '{}',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sga_asset_type ON skull_gate_assets (asset_type);
CREATE INDEX IF NOT EXISTS idx_sga_tags       ON skull_gate_assets USING GIN (tags);

ALTER TABLE skull_gate_assets ENABLE ROW LEVEL SECURITY;
