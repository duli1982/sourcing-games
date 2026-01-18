-- ==========================================
-- REVIEW QUEUE TABLE MIGRATION
-- ==========================================
-- Purpose: Store low-confidence or flagged submissions for manual review
-- ==========================================

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id TEXT NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT,
  game_id TEXT NOT NULL,
  game_title TEXT,
  game_type TEXT NOT NULL DEFAULT 'individual',
  score INTEGER NOT NULL,
  confidence NUMERIC,
  integrity_risk TEXT,
  gaming_risk TEXT,
  integrity_flags TEXT[] DEFAULT '{}',
  gaming_flags TEXT[] DEFAULT '{}',
  reasons TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_player ON review_queue(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_game ON review_queue(game_id, created_at DESC);

COMMENT ON TABLE review_queue IS 'Manual review queue for low-confidence or flagged submissions';
