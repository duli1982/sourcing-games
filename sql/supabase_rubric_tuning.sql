-- ==========================================
-- RUBRIC CRITERIA SCORES TABLE
-- ==========================================
-- Purpose: Store rubric criterion scores per attempt for tuning analytics
-- ==========================================

CREATE TABLE IF NOT EXISTS rubric_criteria_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id TEXT NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT,
  game_id TEXT NOT NULL,
  game_title TEXT,
  game_type TEXT NOT NULL DEFAULT 'individual',
  criterion TEXT NOT NULL,
  points NUMERIC NOT NULL,
  max_points NUMERIC NOT NULL,
  final_score INTEGER NOT NULL,
  ai_score INTEGER,
  validation_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubric_scores_game ON rubric_criteria_scores(game_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rubric_scores_criterion ON rubric_criteria_scores(criterion, created_at DESC);

COMMENT ON TABLE rubric_criteria_scores IS 'Per-criterion scoring data for adaptive rubric tuning';
