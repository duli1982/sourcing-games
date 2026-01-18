-- ============================================================================
-- SCORING ANALYTICS MIGRATION
-- AI Scoring Observability for Pattern Tracking and Rubric Tuning
--
-- This table tracks scoring patterns, disagreements, and confidence levels
-- to help identify games that need rubric tuning and monitor scoring quality.
-- ============================================================================

-- ============================================================================
-- SCORING ANALYTICS TABLE
-- Stores detailed scoring data for each submission attempt
-- ============================================================================
CREATE TABLE IF NOT EXISTS scoring_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attempt identification
  attempt_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT,

  -- Game identification
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('individual', 'team')),

  -- Team info (null for individual games)
  team_id UUID,
  team_name TEXT,

  -- Score components
  final_score INTEGER NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  validation_score INTEGER CHECK (validation_score >= 0 AND validation_score <= 100),
  embedding_similarity REAL CHECK (embedding_similarity >= 0 AND embedding_similarity <= 1),
  multi_reference_score INTEGER CHECK (multi_reference_score >= 0 AND multi_reference_score <= 100),

  -- Ensemble weights used
  ai_weight REAL,
  validation_weight REAL,
  embedding_weight REAL,
  multi_reference_weight REAL,

  -- Confidence and quality metrics
  ai_confidence REAL CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  score_spread REAL, -- Standard deviation of component scores
  reconciliation_applied BOOLEAN DEFAULT false,

  -- Disagreement tracking
  ai_validation_diff INTEGER, -- Absolute difference between AI and validation scores
  has_significant_disagreement BOOLEAN DEFAULT false, -- True if diff >= 10
  disagreement_resolved_by TEXT CHECK (disagreement_resolved_by IN ('ai', 'validation', 'average', 'reconciliation', null)),

  -- Anti-gaming detection
  integrity_check_passed BOOLEAN DEFAULT true,
  integrity_signals JSONB, -- Detailed integrity check results
  gaming_risk_level TEXT CHECK (gaming_risk_level IN ('none', 'low', 'medium', 'high')),

  -- Submission metadata
  submission_length INTEGER,
  submission_word_count INTEGER,
  processing_time_ms INTEGER,

  -- Multi-reference data
  references_compared INTEGER DEFAULT 0,
  verified_references_count INTEGER DEFAULT 0,
  best_reference_similarity REAL,

  -- Scoring version for tracking changes
  scoring_version TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- GAME SCORING STATISTICS TABLE
-- Aggregated statistics per game for dashboards and analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_scoring_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game identification
  game_id TEXT NOT NULL UNIQUE,
  game_title TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('individual', 'team')),

  -- Volume metrics
  total_attempts INTEGER NOT NULL DEFAULT 0,
  unique_players INTEGER NOT NULL DEFAULT 0,

  -- Score distribution
  avg_final_score REAL,
  median_final_score REAL,
  min_final_score INTEGER,
  max_final_score INTEGER,
  score_std_dev REAL,

  -- Score component averages
  avg_ai_score REAL,
  avg_validation_score REAL,
  avg_embedding_similarity REAL,
  avg_multi_reference_score REAL,

  -- Disagreement metrics
  avg_ai_validation_diff REAL,
  significant_disagreement_rate REAL, -- % of attempts with diff >= 10
  disagreement_count INTEGER DEFAULT 0,

  -- Confidence metrics
  avg_ai_confidence REAL,
  low_confidence_rate REAL, -- % of attempts with confidence < 0.7

  -- Anti-gaming metrics
  gaming_detection_rate REAL, -- % flagged for potential gaming
  integrity_failure_rate REAL,

  -- Quality indicators
  needs_rubric_review BOOLEAN DEFAULT false,
  rubric_review_reason TEXT,

  -- Score buckets (for distribution charts)
  score_bucket_0_20 INTEGER DEFAULT 0,
  score_bucket_21_40 INTEGER DEFAULT 0,
  score_bucket_41_60 INTEGER DEFAULT 0,
  score_bucket_61_80 INTEGER DEFAULT 0,
  score_bucket_81_100 INTEGER DEFAULT 0,

  -- Timestamps
  first_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  stats_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SCORING DISAGREEMENTS TABLE
-- Detailed log of significant scoring disagreements for review
-- ============================================================================
CREATE TABLE IF NOT EXISTS scoring_disagreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to analytics record
  analytics_id UUID NOT NULL REFERENCES scoring_analytics(id) ON DELETE CASCADE,

  -- Game and player info
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,
  player_id TEXT NOT NULL,

  -- Score details
  ai_score INTEGER NOT NULL,
  validation_score INTEGER NOT NULL,
  score_difference INTEGER NOT NULL,
  final_score INTEGER NOT NULL,
  resolution_method TEXT NOT NULL,

  -- Context for review
  submission_excerpt TEXT, -- First 500 chars of submission
  ai_feedback TEXT,
  validation_feedback TEXT,

  -- Review status
  reviewed BOOLEAN DEFAULT false,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rubric_update_needed BOOLEAN,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PLAYER SCORING HISTORY TABLE
-- Aggregated player statistics for personalized feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_scoring_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player identification
  player_id TEXT NOT NULL,
  player_name TEXT,

  -- Overall statistics
  total_games_played INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,

  -- Score statistics
  avg_score REAL,
  best_score INTEGER,
  worst_score INTEGER,
  score_trend TEXT CHECK (score_trend IN ('improving', 'stable', 'declining', 'new')),

  -- Recent performance (last 10 games)
  recent_avg_score REAL,
  recent_games JSONB, -- Array of {game_id, score, timestamp}

  -- Skill analysis
  strongest_skill_category TEXT,
  weakest_skill_category TEXT,
  skill_scores JSONB, -- {category: avg_score}

  -- Engagement metrics
  games_above_80 INTEGER DEFAULT 0,
  games_below_50 INTEGER DEFAULT 0,
  improvement_rate REAL, -- % improvement from first 5 to last 5 games

  -- Personalization data
  preferred_feedback_style TEXT CHECK (preferred_feedback_style IN ('detailed', 'concise', 'encouraging', 'direct')),
  areas_for_improvement JSONB, -- Array of improvement suggestions

  -- Team participation (if applicable)
  teams_participated JSONB, -- Array of team_ids
  team_avg_score REAL,

  -- Timestamps
  first_game_at TIMESTAMPTZ,
  last_game_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Scoring analytics indexes
CREATE INDEX IF NOT EXISTS idx_scoring_analytics_game_id
  ON scoring_analytics(game_id);

CREATE INDEX IF NOT EXISTS idx_scoring_analytics_player_id
  ON scoring_analytics(player_id);

CREATE INDEX IF NOT EXISTS idx_scoring_analytics_created_at
  ON scoring_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scoring_analytics_disagreement
  ON scoring_analytics(game_id, has_significant_disagreement)
  WHERE has_significant_disagreement = true;

CREATE INDEX IF NOT EXISTS idx_scoring_analytics_confidence
  ON scoring_analytics(game_id, ai_confidence)
  WHERE ai_confidence < 0.7;

CREATE INDEX IF NOT EXISTS idx_scoring_analytics_gaming
  ON scoring_analytics(game_id, gaming_risk_level)
  WHERE gaming_risk_level IN ('medium', 'high');

-- Game stats indexes
CREATE INDEX IF NOT EXISTS idx_game_scoring_stats_needs_review
  ON game_scoring_stats(needs_rubric_review)
  WHERE needs_rubric_review = true;

-- Disagreements indexes
CREATE INDEX IF NOT EXISTS idx_scoring_disagreements_game_id
  ON scoring_disagreements(game_id);

CREATE INDEX IF NOT EXISTS idx_scoring_disagreements_unreviewed
  ON scoring_disagreements(reviewed, created_at DESC)
  WHERE reviewed = false;

-- Player history indexes
CREATE INDEX IF NOT EXISTS idx_player_scoring_history_player_id
  ON player_scoring_history(player_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_scoring_history_unique_player
  ON player_scoring_history(player_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to log a scoring analytics record
CREATE OR REPLACE FUNCTION log_scoring_analytics(
  p_attempt_id UUID,
  p_player_id TEXT,
  p_player_name TEXT,
  p_game_id TEXT,
  p_game_title TEXT,
  p_game_type TEXT,
  p_team_id UUID DEFAULT NULL,
  p_team_name TEXT DEFAULT NULL,
  p_final_score INTEGER DEFAULT NULL,
  p_ai_score INTEGER DEFAULT NULL,
  p_validation_score INTEGER DEFAULT NULL,
  p_embedding_similarity REAL DEFAULT NULL,
  p_multi_reference_score INTEGER DEFAULT NULL,
  p_ai_weight REAL DEFAULT NULL,
  p_validation_weight REAL DEFAULT NULL,
  p_embedding_weight REAL DEFAULT NULL,
  p_multi_reference_weight REAL DEFAULT NULL,
  p_ai_confidence REAL DEFAULT NULL,
  p_integrity_signals JSONB DEFAULT NULL,
  p_gaming_risk_level TEXT DEFAULT 'none',
  p_submission_length INTEGER DEFAULT NULL,
  p_submission_word_count INTEGER DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_references_compared INTEGER DEFAULT 0,
  p_verified_references_count INTEGER DEFAULT 0,
  p_best_reference_similarity REAL DEFAULT NULL,
  p_scoring_version TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_analytics_id UUID;
  v_ai_validation_diff INTEGER;
  v_has_significant_disagreement BOOLEAN;
  v_integrity_passed BOOLEAN;
  v_score_spread REAL;
  v_scores REAL[];
BEGIN
  -- Calculate AI-Validation difference
  IF p_ai_score IS NOT NULL AND p_validation_score IS NOT NULL THEN
    v_ai_validation_diff := ABS(p_ai_score - p_validation_score);
    v_has_significant_disagreement := v_ai_validation_diff >= 10;
  ELSE
    v_ai_validation_diff := NULL;
    v_has_significant_disagreement := false;
  END IF;

  -- Check integrity
  v_integrity_passed := p_gaming_risk_level IN ('none', 'low');

  -- Calculate score spread (std dev of available scores)
  v_scores := ARRAY[]::REAL[];
  IF p_ai_score IS NOT NULL THEN v_scores := v_scores || p_ai_score::REAL; END IF;
  IF p_validation_score IS NOT NULL THEN v_scores := v_scores || p_validation_score::REAL; END IF;
  IF p_multi_reference_score IS NOT NULL THEN v_scores := v_scores || p_multi_reference_score::REAL; END IF;

  IF array_length(v_scores, 1) >= 2 THEN
    SELECT stddev(s) INTO v_score_spread FROM unnest(v_scores) AS s;
  END IF;

  -- Insert analytics record
  INSERT INTO scoring_analytics (
    attempt_id, player_id, player_name,
    game_id, game_title, game_type,
    team_id, team_name,
    final_score, ai_score, validation_score,
    embedding_similarity, multi_reference_score,
    ai_weight, validation_weight, embedding_weight, multi_reference_weight,
    ai_confidence, score_spread,
    ai_validation_diff, has_significant_disagreement,
    integrity_check_passed, integrity_signals, gaming_risk_level,
    submission_length, submission_word_count, processing_time_ms,
    references_compared, verified_references_count, best_reference_similarity,
    scoring_version
  ) VALUES (
    p_attempt_id, p_player_id, p_player_name,
    p_game_id, p_game_title, p_game_type,
    p_team_id, p_team_name,
    p_final_score, p_ai_score, p_validation_score,
    p_embedding_similarity, p_multi_reference_score,
    p_ai_weight, p_validation_weight, p_embedding_weight, p_multi_reference_weight,
    p_ai_confidence, v_score_spread,
    v_ai_validation_diff, v_has_significant_disagreement,
    v_integrity_passed, p_integrity_signals, p_gaming_risk_level,
    p_submission_length, p_submission_word_count, p_processing_time_ms,
    p_references_compared, p_verified_references_count, p_best_reference_similarity,
    p_scoring_version
  )
  RETURNING id INTO v_analytics_id;

  -- Log significant disagreement for review
  IF v_has_significant_disagreement THEN
    INSERT INTO scoring_disagreements (
      analytics_id, game_id, game_title, player_id,
      ai_score, validation_score, score_difference, final_score,
      resolution_method
    ) VALUES (
      v_analytics_id, p_game_id, p_game_title, p_player_id,
      p_ai_score, p_validation_score, v_ai_validation_diff, p_final_score,
      CASE
        WHEN p_ai_weight > p_validation_weight THEN 'ai'
        WHEN p_validation_weight > p_ai_weight THEN 'validation'
        ELSE 'average'
      END
    );
  END IF;

  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update game scoring statistics
CREATE OR REPLACE FUNCTION update_game_scoring_stats(p_game_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
BEGIN
  -- Calculate all statistics for the game
  SELECT
    COUNT(*)::INTEGER as total_attempts,
    COUNT(DISTINCT player_id)::INTEGER as unique_players,
    AVG(final_score)::REAL as avg_final_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_score)::REAL as median_final_score,
    MIN(final_score) as min_final_score,
    MAX(final_score) as max_final_score,
    STDDEV(final_score)::REAL as score_std_dev,
    AVG(ai_score)::REAL as avg_ai_score,
    AVG(validation_score)::REAL as avg_validation_score,
    AVG(embedding_similarity)::REAL as avg_embedding_similarity,
    AVG(multi_reference_score)::REAL as avg_multi_reference_score,
    AVG(ai_validation_diff)::REAL as avg_ai_validation_diff,
    (COUNT(*) FILTER (WHERE has_significant_disagreement = true)::REAL / NULLIF(COUNT(*), 0)) as significant_disagreement_rate,
    COUNT(*) FILTER (WHERE has_significant_disagreement = true)::INTEGER as disagreement_count,
    AVG(ai_confidence)::REAL as avg_ai_confidence,
    (COUNT(*) FILTER (WHERE ai_confidence < 0.7)::REAL / NULLIF(COUNT(*), 0)) as low_confidence_rate,
    (COUNT(*) FILTER (WHERE gaming_risk_level IN ('medium', 'high'))::REAL / NULLIF(COUNT(*), 0)) as gaming_detection_rate,
    (COUNT(*) FILTER (WHERE integrity_check_passed = false)::REAL / NULLIF(COUNT(*), 0)) as integrity_failure_rate,
    COUNT(*) FILTER (WHERE final_score BETWEEN 0 AND 20)::INTEGER as bucket_0_20,
    COUNT(*) FILTER (WHERE final_score BETWEEN 21 AND 40)::INTEGER as bucket_21_40,
    COUNT(*) FILTER (WHERE final_score BETWEEN 41 AND 60)::INTEGER as bucket_41_60,
    COUNT(*) FILTER (WHERE final_score BETWEEN 61 AND 80)::INTEGER as bucket_61_80,
    COUNT(*) FILTER (WHERE final_score BETWEEN 81 AND 100)::INTEGER as bucket_81_100,
    MIN(created_at) as first_attempt_at,
    MAX(created_at) as last_attempt_at,
    MAX(game_title) as game_title,
    MAX(game_type) as game_type
  INTO v_stats
  FROM scoring_analytics
  WHERE game_id = p_game_id;

  -- Determine if rubric review is needed
  -- Conditions: high disagreement rate, low confidence, or unusual score distribution

  -- Upsert the stats record
  INSERT INTO game_scoring_stats (
    game_id, game_title, game_type,
    total_attempts, unique_players,
    avg_final_score, median_final_score, min_final_score, max_final_score, score_std_dev,
    avg_ai_score, avg_validation_score, avg_embedding_similarity, avg_multi_reference_score,
    avg_ai_validation_diff, significant_disagreement_rate, disagreement_count,
    avg_ai_confidence, low_confidence_rate,
    gaming_detection_rate, integrity_failure_rate,
    needs_rubric_review, rubric_review_reason,
    score_bucket_0_20, score_bucket_21_40, score_bucket_41_60, score_bucket_61_80, score_bucket_81_100,
    first_attempt_at, last_attempt_at, stats_updated_at
  ) VALUES (
    p_game_id, v_stats.game_title, v_stats.game_type,
    v_stats.total_attempts, v_stats.unique_players,
    v_stats.avg_final_score, v_stats.median_final_score, v_stats.min_final_score, v_stats.max_final_score, v_stats.score_std_dev,
    v_stats.avg_ai_score, v_stats.avg_validation_score, v_stats.avg_embedding_similarity, v_stats.avg_multi_reference_score,
    v_stats.avg_ai_validation_diff, v_stats.significant_disagreement_rate, v_stats.disagreement_count,
    v_stats.avg_ai_confidence, v_stats.low_confidence_rate,
    v_stats.gaming_detection_rate, v_stats.integrity_failure_rate,
    -- Set needs_rubric_review if conditions met
    (v_stats.significant_disagreement_rate > 0.20 OR v_stats.low_confidence_rate > 0.30 OR v_stats.avg_ai_validation_diff > 15),
    CASE
      WHEN v_stats.significant_disagreement_rate > 0.20 THEN 'High disagreement rate between AI and validation'
      WHEN v_stats.low_confidence_rate > 0.30 THEN 'Many low confidence scores'
      WHEN v_stats.avg_ai_validation_diff > 15 THEN 'Large average difference between AI and validation'
      ELSE NULL
    END,
    v_stats.bucket_0_20, v_stats.bucket_21_40, v_stats.bucket_41_60, v_stats.bucket_61_80, v_stats.bucket_81_100,
    v_stats.first_attempt_at, v_stats.last_attempt_at, NOW()
  )
  ON CONFLICT (game_id) DO UPDATE SET
    game_title = EXCLUDED.game_title,
    game_type = EXCLUDED.game_type,
    total_attempts = EXCLUDED.total_attempts,
    unique_players = EXCLUDED.unique_players,
    avg_final_score = EXCLUDED.avg_final_score,
    median_final_score = EXCLUDED.median_final_score,
    min_final_score = EXCLUDED.min_final_score,
    max_final_score = EXCLUDED.max_final_score,
    score_std_dev = EXCLUDED.score_std_dev,
    avg_ai_score = EXCLUDED.avg_ai_score,
    avg_validation_score = EXCLUDED.avg_validation_score,
    avg_embedding_similarity = EXCLUDED.avg_embedding_similarity,
    avg_multi_reference_score = EXCLUDED.avg_multi_reference_score,
    avg_ai_validation_diff = EXCLUDED.avg_ai_validation_diff,
    significant_disagreement_rate = EXCLUDED.significant_disagreement_rate,
    disagreement_count = EXCLUDED.disagreement_count,
    avg_ai_confidence = EXCLUDED.avg_ai_confidence,
    low_confidence_rate = EXCLUDED.low_confidence_rate,
    gaming_detection_rate = EXCLUDED.gaming_detection_rate,
    integrity_failure_rate = EXCLUDED.integrity_failure_rate,
    needs_rubric_review = EXCLUDED.needs_rubric_review,
    rubric_review_reason = EXCLUDED.rubric_review_reason,
    score_bucket_0_20 = EXCLUDED.score_bucket_0_20,
    score_bucket_21_40 = EXCLUDED.score_bucket_21_40,
    score_bucket_41_60 = EXCLUDED.score_bucket_41_60,
    score_bucket_61_80 = EXCLUDED.score_bucket_61_80,
    score_bucket_81_100 = EXCLUDED.score_bucket_81_100,
    first_attempt_at = EXCLUDED.first_attempt_at,
    last_attempt_at = EXCLUDED.last_attempt_at,
    stats_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update or create player history
CREATE OR REPLACE FUNCTION update_player_scoring_history(
  p_player_id TEXT,
  p_player_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
  v_recent_games JSONB;
  v_skill_scores JSONB;
  v_first_five_avg REAL;
  v_last_five_avg REAL;
  v_trend TEXT;
BEGIN
  -- Get overall player statistics
  SELECT
    COUNT(DISTINCT game_id)::INTEGER as total_games,
    COUNT(*)::INTEGER as total_attempts,
    AVG(final_score)::REAL as avg_score,
    MAX(final_score) as best_score,
    MIN(final_score) as worst_score,
    COUNT(*) FILTER (WHERE final_score >= 80)::INTEGER as games_above_80,
    COUNT(*) FILTER (WHERE final_score < 50)::INTEGER as games_below_50,
    MIN(created_at) as first_game_at,
    MAX(created_at) as last_game_at
  INTO v_stats
  FROM scoring_analytics
  WHERE player_id = p_player_id;

  -- Get recent games (last 10)
  SELECT jsonb_agg(
    jsonb_build_object(
      'game_id', game_id,
      'game_title', game_title,
      'score', final_score,
      'timestamp', created_at
    ) ORDER BY created_at DESC
  )
  INTO v_recent_games
  FROM (
    SELECT game_id, game_title, final_score, created_at
    FROM scoring_analytics
    WHERE player_id = p_player_id
    ORDER BY created_at DESC
    LIMIT 10
  ) recent;

  -- Calculate trend (comparing first 5 to last 5 attempts)
  SELECT AVG(final_score)::REAL INTO v_first_five_avg
  FROM (
    SELECT final_score FROM scoring_analytics
    WHERE player_id = p_player_id
    ORDER BY created_at ASC
    LIMIT 5
  ) first_five;

  SELECT AVG(final_score)::REAL INTO v_last_five_avg
  FROM (
    SELECT final_score FROM scoring_analytics
    WHERE player_id = p_player_id
    ORDER BY created_at DESC
    LIMIT 5
  ) last_five;

  IF v_stats.total_attempts < 5 THEN
    v_trend := 'new';
  ELSIF v_last_five_avg > v_first_five_avg + 5 THEN
    v_trend := 'improving';
  ELSIF v_last_five_avg < v_first_five_avg - 5 THEN
    v_trend := 'declining';
  ELSE
    v_trend := 'stable';
  END IF;

  -- Upsert player history
  INSERT INTO player_scoring_history (
    player_id, player_name,
    total_games_played, total_attempts,
    avg_score, best_score, worst_score, score_trend,
    recent_avg_score, recent_games,
    games_above_80, games_below_50,
    improvement_rate,
    first_game_at, last_game_at, updated_at
  ) VALUES (
    p_player_id, COALESCE(p_player_name, p_player_id),
    v_stats.total_games, v_stats.total_attempts,
    v_stats.avg_score, v_stats.best_score, v_stats.worst_score, v_trend,
    v_last_five_avg, v_recent_games,
    v_stats.games_above_80, v_stats.games_below_50,
    CASE WHEN v_first_five_avg > 0 THEN ((v_last_five_avg - v_first_five_avg) / v_first_five_avg * 100)::REAL ELSE 0 END,
    v_stats.first_game_at, v_stats.last_game_at, NOW()
  )
  ON CONFLICT (player_id) DO UPDATE SET
    player_name = COALESCE(EXCLUDED.player_name, player_scoring_history.player_name),
    total_games_played = EXCLUDED.total_games_played,
    total_attempts = EXCLUDED.total_attempts,
    avg_score = EXCLUDED.avg_score,
    best_score = EXCLUDED.best_score,
    worst_score = EXCLUDED.worst_score,
    score_trend = EXCLUDED.score_trend,
    recent_avg_score = EXCLUDED.recent_avg_score,
    recent_games = EXCLUDED.recent_games,
    games_above_80 = EXCLUDED.games_above_80,
    games_below_50 = EXCLUDED.games_below_50,
    improvement_rate = EXCLUDED.improvement_rate,
    first_game_at = EXCLUDED.first_game_at,
    last_game_at = EXCLUDED.last_game_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get player history for personalized feedback
CREATE OR REPLACE FUNCTION get_player_history(p_player_id TEXT)
RETURNS TABLE (
  player_id TEXT,
  player_name TEXT,
  total_games_played INTEGER,
  total_attempts INTEGER,
  avg_score REAL,
  best_score INTEGER,
  worst_score INTEGER,
  score_trend TEXT,
  recent_avg_score REAL,
  recent_games JSONB,
  games_above_80 INTEGER,
  games_below_50 INTEGER,
  improvement_rate REAL,
  areas_for_improvement JSONB,
  first_game_at TIMESTAMPTZ,
  last_game_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    psh.player_id,
    psh.player_name,
    psh.total_games_played,
    psh.total_attempts,
    psh.avg_score,
    psh.best_score,
    psh.worst_score,
    psh.score_trend,
    psh.recent_avg_score,
    psh.recent_games,
    psh.games_above_80,
    psh.games_below_50,
    psh.improvement_rate,
    psh.areas_for_improvement,
    psh.first_game_at,
    psh.last_game_at
  FROM player_scoring_history psh
  WHERE psh.player_id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get games needing rubric review
CREATE OR REPLACE FUNCTION get_games_needing_review()
RETURNS TABLE (
  game_id TEXT,
  game_title TEXT,
  game_type TEXT,
  total_attempts INTEGER,
  avg_final_score REAL,
  significant_disagreement_rate REAL,
  low_confidence_rate REAL,
  avg_ai_validation_diff REAL,
  rubric_review_reason TEXT,
  stats_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gss.game_id,
    gss.game_title,
    gss.game_type,
    gss.total_attempts,
    gss.avg_final_score,
    gss.significant_disagreement_rate,
    gss.low_confidence_rate,
    gss.avg_ai_validation_diff,
    gss.rubric_review_reason,
    gss.stats_updated_at
  FROM game_scoring_stats gss
  WHERE gss.needs_rubric_review = true
  ORDER BY gss.significant_disagreement_rate DESC, gss.low_confidence_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE scoring_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scoring_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_disagreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_scoring_history ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access)
CREATE POLICY "Service role full access on scoring_analytics"
  ON scoring_analytics FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on game_scoring_stats"
  ON game_scoring_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on scoring_disagreements"
  ON scoring_disagreements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on player_scoring_history"
  ON player_scoring_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can read game stats (for leaderboards, etc.)
CREATE POLICY "Authenticated users can read game stats"
  ON game_scoring_stats FOR SELECT TO authenticated
  USING (true);

-- Players can read their own history
CREATE POLICY "Players can read own history"
  ON player_scoring_history FOR SELECT TO authenticated
  USING (player_id = auth.uid()::TEXT);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scoring_analytics IS
  'Detailed scoring data for each submission attempt, used for observability and pattern analysis';

COMMENT ON TABLE game_scoring_stats IS
  'Aggregated statistics per game for dashboards and identifying games needing rubric review';

COMMENT ON TABLE scoring_disagreements IS
  'Log of significant AI-validation score disagreements for manual review';

COMMENT ON TABLE player_scoring_history IS
  'Player-level aggregated statistics for personalized feedback generation';

COMMENT ON FUNCTION log_scoring_analytics IS
  'Log a scoring analytics record and auto-detect disagreements';

COMMENT ON FUNCTION update_game_scoring_stats IS
  'Recalculate and update aggregated statistics for a game';

COMMENT ON FUNCTION update_player_scoring_history IS
  'Update or create player history record with latest statistics';

COMMENT ON FUNCTION get_games_needing_review IS
  'Get list of games flagged for rubric review due to scoring issues';
