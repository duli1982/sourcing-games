-- ============================================================================
-- REFERENCE ANSWERS MIGRATION
-- Multi-Reference Embedding Database for Enhanced Scoring
--
-- This table stores high-scoring submissions with their embeddings
-- to enable comparison against multiple good answers, not just one example.
-- ============================================================================

-- Enable pgvector extension for embedding storage (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- REFERENCE ANSWERS TABLE
-- Stores high-quality submissions that serve as reference points for scoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS reference_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game identification
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,

  -- The submission content
  submission TEXT NOT NULL,

  -- Score information
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),

  -- Embedding vector (768 dimensions for text-embedding-004)
  -- Using vector type from pgvector extension
  embedding vector(768),

  -- Source tracking
  source_type TEXT NOT NULL DEFAULT 'player' CHECK (source_type IN ('player', 'example', 'curated')),
  source_player_id TEXT, -- NULL for example solutions or curated answers
  source_player_name TEXT,

  -- Quality flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false, -- Admin-verified as high quality

  -- Metadata
  skill_category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- Scoring metadata at time of submission
  ai_score INTEGER,
  validation_score INTEGER,
  embedding_similarity REAL, -- Similarity to example at time of scoring

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding references by game
CREATE INDEX IF NOT EXISTS idx_reference_answers_game_id
  ON reference_answers(game_id);

-- Index for finding high-scoring references
CREATE INDEX IF NOT EXISTS idx_reference_answers_score
  ON reference_answers(score DESC);

-- Composite index for common query pattern: game + score + active
CREATE INDEX IF NOT EXISTS idx_reference_answers_game_score_active
  ON reference_answers(game_id, score DESC)
  WHERE is_active = true;

-- Index for embedding similarity searches (using pgvector)
-- This enables fast cosine similarity lookups
CREATE INDEX IF NOT EXISTS idx_reference_answers_embedding
  ON reference_answers
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to find similar reference answers using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_references(
  p_game_id TEXT,
  p_query_embedding vector(768),
  p_limit INTEGER DEFAULT 10,
  p_min_score INTEGER DEFAULT 75
)
RETURNS TABLE (
  id UUID,
  game_id TEXT,
  submission TEXT,
  score INTEGER,
  similarity REAL,
  source_type TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ra.id,
    ra.game_id,
    ra.submission,
    ra.score,
    (1 - (ra.embedding <=> p_query_embedding))::REAL as similarity,
    ra.source_type,
    ra.is_verified
  FROM reference_answers ra
  WHERE ra.game_id = p_game_id
    AND ra.is_active = true
    AND ra.score >= p_min_score
    AND ra.embedding IS NOT NULL
  ORDER BY ra.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get reference statistics for a game
CREATE OR REPLACE FUNCTION get_reference_stats(p_game_id TEXT)
RETURNS TABLE (
  total_references BIGINT,
  verified_count BIGINT,
  avg_score NUMERIC,
  min_score INTEGER,
  max_score INTEGER,
  player_submissions BIGINT,
  example_submissions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_references,
    COUNT(*) FILTER (WHERE is_verified = true)::BIGINT as verified_count,
    ROUND(AVG(score)::NUMERIC, 2) as avg_score,
    MIN(score) as min_score,
    MAX(score) as max_score,
    COUNT(*) FILTER (WHERE source_type = 'player')::BIGINT as player_submissions,
    COUNT(*) FILTER (WHERE source_type = 'example')::BIGINT as example_submissions
  FROM reference_answers
  WHERE game_id = p_game_id
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to add a reference answer (with duplicate check)
CREATE OR REPLACE FUNCTION add_reference_answer(
  p_game_id TEXT,
  p_game_title TEXT,
  p_submission TEXT,
  p_score INTEGER,
  p_embedding vector(768),
  p_source_type TEXT DEFAULT 'player',
  p_source_player_id TEXT DEFAULT NULL,
  p_source_player_name TEXT DEFAULT NULL,
  p_skill_category TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_ai_score INTEGER DEFAULT NULL,
  p_validation_score INTEGER DEFAULT NULL,
  p_embedding_similarity REAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_similarity REAL;
BEGIN
  -- Check if very similar submission already exists (>95% similarity)
  SELECT ra.id, (1 - (ra.embedding <=> p_embedding))::REAL
  INTO v_existing_id, v_similarity
  FROM reference_answers ra
  WHERE ra.game_id = p_game_id
    AND ra.is_active = true
    AND ra.embedding IS NOT NULL
  ORDER BY ra.embedding <=> p_embedding
  LIMIT 1;

  -- If very similar submission exists, don't add duplicate
  IF v_similarity IS NOT NULL AND v_similarity > 0.95 THEN
    RETURN NULL; -- Indicate duplicate
  END IF;

  -- Insert new reference answer
  INSERT INTO reference_answers (
    game_id,
    game_title,
    submission,
    score,
    embedding,
    source_type,
    source_player_id,
    source_player_name,
    skill_category,
    difficulty,
    ai_score,
    validation_score,
    embedding_similarity
  ) VALUES (
    p_game_id,
    p_game_title,
    p_submission,
    p_score,
    p_embedding,
    p_source_type,
    p_source_player_id,
    p_source_player_name,
    p_skill_category,
    p_difficulty,
    p_ai_score,
    p_validation_score,
    p_embedding_similarity
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reference_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reference_answers_updated_at ON reference_answers;
CREATE TRIGGER trigger_reference_answers_updated_at
  BEFORE UPDATE ON reference_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_reference_answers_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE reference_answers ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "Service role full access on reference_answers"
  ON reference_answers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read active references
CREATE POLICY "Authenticated users can read active references"
  ON reference_answers
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE reference_answers IS
  'Stores high-quality submissions with embeddings for multi-reference scoring';

COMMENT ON COLUMN reference_answers.embedding IS
  '768-dimensional embedding vector from text-embedding-004 model';

COMMENT ON COLUMN reference_answers.source_type IS
  'Origin of the reference: player (auto-collected), example (from game definition), curated (admin-added)';

COMMENT ON COLUMN reference_answers.is_verified IS
  'Whether an admin has verified this as a high-quality reference';

COMMENT ON FUNCTION find_similar_references IS
  'Find the most similar reference answers to a query embedding using cosine similarity';

COMMENT ON FUNCTION add_reference_answer IS
  'Add a new reference answer, checking for duplicates (>95% similarity)';
