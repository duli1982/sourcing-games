-- ==========================================
-- GAME OVERRIDE VERSIONING
-- ==========================================
-- Purpose: Store version history for game overrides (custom games and rubrics)
-- ==========================================

CREATE TABLE IF NOT EXISTS game_override_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  task TEXT,
  prompt_template TEXT,
  rubric_json JSONB,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_game_override_versions_game_id ON game_override_versions(game_id, created_at DESC);

COMMENT ON TABLE game_override_versions IS 'Version history for admin-managed game overrides and rubrics';
