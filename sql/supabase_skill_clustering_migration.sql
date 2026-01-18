-- ============================================================================
-- Skill Clustering & Cross-Game Progression Migration
-- Version: 1.0.0
--
-- This migration creates tables and functions for:
-- 1. Game similarity clusters based on embeddings
-- 2. Cross-game skill progression tracking
-- 3. Related game recommendations
-- ============================================================================

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE: game_embeddings
-- Stores embedding vectors for each game's content (title, description, task, example)
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_embeddings (
    game_id TEXT PRIMARY KEY,
    game_title TEXT NOT NULL,
    skill_category TEXT NOT NULL,
    difficulty TEXT NOT NULL,

    -- Combined embedding from game content
    content_embedding VECTOR(1536),

    -- Individual embeddings for fine-grained similarity
    task_embedding VECTOR(1536),
    example_embedding VECTOR(1536),

    -- Derived skill tags from embeddings
    skill_tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Metadata
    content_hash TEXT, -- Hash of content to detect changes
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_game_embeddings_content ON game_embeddings
    USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_game_embeddings_skill ON game_embeddings(skill_category);
CREATE INDEX IF NOT EXISTS idx_game_embeddings_difficulty ON game_embeddings(difficulty);

-- ============================================================================
-- TABLE: game_clusters
-- Pre-computed clusters of similar games
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_name TEXT NOT NULL, -- e.g., "Advanced Boolean - Tech Focus"
    cluster_type TEXT NOT NULL, -- 'skill', 'difficulty', 'hybrid', 'semantic'

    -- Games in this cluster
    game_ids TEXT[] NOT NULL,
    centroid_embedding VECTOR(1536), -- Cluster center for similarity

    -- Cluster characteristics
    primary_skill TEXT,
    avg_difficulty FLOAT,
    avg_score FLOAT, -- Average score across all attempts in cluster

    -- Metadata
    game_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_clusters_type ON game_clusters(cluster_type);
CREATE INDEX IF NOT EXISTS idx_game_clusters_skill ON game_clusters(primary_skill);

-- ============================================================================
-- TABLE: game_similarity_pairs
-- Pre-computed similarity scores between game pairs
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_similarity_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id_a TEXT NOT NULL,
    game_id_b TEXT NOT NULL,

    -- Similarity metrics
    overall_similarity FLOAT NOT NULL, -- 0-1, combined similarity
    content_similarity FLOAT, -- Based on description/task text
    skill_similarity FLOAT, -- Based on skill category overlap
    difficulty_similarity FLOAT, -- Based on difficulty level

    -- Relationship type
    relationship_type TEXT, -- 'prerequisite', 'parallel', 'advanced', 'variation'

    -- Metadata
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure uniqueness (a-b same as b-a)
    CONSTRAINT unique_game_pair UNIQUE (game_id_a, game_id_b),
    CONSTRAINT ordered_game_ids CHECK (game_id_a < game_id_b)
);

CREATE INDEX IF NOT EXISTS idx_game_similarity_game_a ON game_similarity_pairs(game_id_a);
CREATE INDEX IF NOT EXISTS idx_game_similarity_game_b ON game_similarity_pairs(game_id_b);
CREATE INDEX IF NOT EXISTS idx_game_similarity_overall ON game_similarity_pairs(overall_similarity DESC);

-- ============================================================================
-- TABLE: player_skill_clusters
-- Tracks player progress within game clusters
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_skill_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,
    cluster_id UUID NOT NULL REFERENCES game_clusters(id) ON DELETE CASCADE,

    -- Progress metrics
    games_played INT DEFAULT 0,
    total_games_in_cluster INT DEFAULT 0,
    completion_rate FLOAT DEFAULT 0, -- games_played / total_games

    -- Score progression
    first_score INT,
    best_score INT,
    latest_score INT,
    avg_score FLOAT,
    score_trend TEXT DEFAULT 'new', -- 'improving', 'stable', 'declining', 'new'
    improvement_rate FLOAT DEFAULT 0, -- % improvement from first to latest

    -- Timestamps
    first_played_at TIMESTAMP WITH TIME ZONE,
    last_played_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_player_cluster UNIQUE (player_id, cluster_id)
);

CREATE INDEX IF NOT EXISTS idx_player_skill_clusters_player ON player_skill_clusters(player_id);
CREATE INDEX IF NOT EXISTS idx_player_skill_clusters_trend ON player_skill_clusters(score_trend);

-- ============================================================================
-- TABLE: cross_game_progression
-- Tracks how skills transfer across related games
-- ============================================================================

CREATE TABLE IF NOT EXISTS cross_game_progression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,

    -- Game transition
    from_game_id TEXT NOT NULL,
    to_game_id TEXT NOT NULL,
    game_similarity FLOAT, -- How similar the games are

    -- Score progression
    from_score INT NOT NULL,
    to_score INT NOT NULL,
    score_change INT, -- to_score - from_score

    -- Transfer analysis
    skill_transferred BOOLEAN, -- Did skills from first game help?
    transfer_effectiveness FLOAT, -- -1 to 1, how well skills transferred

    -- Time between games
    time_between_games INTERVAL,
    days_between INT,

    -- Metadata
    from_played_at TIMESTAMP WITH TIME ZONE NOT NULL,
    to_played_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_game_player ON cross_game_progression(player_id);
CREATE INDEX IF NOT EXISTS idx_cross_game_from ON cross_game_progression(from_game_id);
CREATE INDEX IF NOT EXISTS idx_cross_game_to ON cross_game_progression(to_game_id);

-- ============================================================================
-- FUNCTION: find_similar_games
-- Find games similar to a given game using vector similarity
-- ============================================================================

CREATE OR REPLACE FUNCTION find_similar_games(
    p_game_id TEXT,
    p_limit INT DEFAULT 5,
    p_min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    game_id TEXT,
    game_title TEXT,
    skill_category TEXT,
    difficulty TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_embedding VECTOR(1536);
BEGIN
    -- Get the source game's embedding
    SELECT content_embedding INTO v_embedding
    FROM game_embeddings
    WHERE game_embeddings.game_id = p_game_id;

    IF v_embedding IS NULL THEN
        RETURN;
    END IF;

    -- Find similar games by cosine similarity
    RETURN QUERY
    SELECT
        ge.game_id,
        ge.game_title,
        ge.skill_category,
        ge.difficulty,
        (1 - (ge.content_embedding <=> v_embedding))::FLOAT AS similarity
    FROM game_embeddings ge
    WHERE ge.game_id != p_game_id
      AND ge.content_embedding IS NOT NULL
      AND (1 - (ge.content_embedding <=> v_embedding)) >= p_min_similarity
    ORDER BY ge.content_embedding <=> v_embedding
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: get_player_cluster_progress
-- Get a player's progress across all skill clusters
-- ============================================================================

CREATE OR REPLACE FUNCTION get_player_cluster_progress(p_player_id TEXT)
RETURNS TABLE (
    cluster_id UUID,
    cluster_name TEXT,
    cluster_type TEXT,
    primary_skill TEXT,
    games_played INT,
    total_games INT,
    completion_rate FLOAT,
    avg_score FLOAT,
    best_score INT,
    score_trend TEXT,
    improvement_rate FLOAT,
    last_played_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        psc.cluster_id,
        gc.cluster_name,
        gc.cluster_type,
        gc.primary_skill,
        psc.games_played,
        psc.total_games_in_cluster AS total_games,
        psc.completion_rate,
        psc.avg_score,
        psc.best_score,
        psc.score_trend,
        psc.improvement_rate,
        psc.last_played_at
    FROM player_skill_clusters psc
    JOIN game_clusters gc ON psc.cluster_id = gc.id
    WHERE psc.player_id = p_player_id
      AND gc.is_active = true
    ORDER BY psc.last_played_at DESC NULLS LAST;
END;
$$;

-- ============================================================================
-- FUNCTION: update_player_cluster_progress
-- Update a player's progress after completing a game
-- ============================================================================

CREATE OR REPLACE FUNCTION update_player_cluster_progress(
    p_player_id TEXT,
    p_game_id TEXT,
    p_score INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_cluster_id UUID;
    v_current RECORD;
    v_new_avg FLOAT;
    v_new_trend TEXT;
    v_improvement FLOAT;
BEGIN
    -- Find all clusters containing this game
    FOR v_cluster_id IN
        SELECT id FROM game_clusters
        WHERE p_game_id = ANY(game_ids) AND is_active = true
    LOOP
        -- Get or create player cluster record
        SELECT * INTO v_current
        FROM player_skill_clusters
        WHERE player_id = p_player_id AND cluster_id = v_cluster_id;

        IF NOT FOUND THEN
            -- Create new record
            INSERT INTO player_skill_clusters (
                player_id,
                cluster_id,
                games_played,
                total_games_in_cluster,
                first_score,
                best_score,
                latest_score,
                avg_score,
                score_trend,
                first_played_at,
                last_played_at
            )
            SELECT
                p_player_id,
                v_cluster_id,
                1,
                array_length(game_ids, 1),
                p_score,
                p_score,
                p_score,
                p_score::FLOAT,
                'new',
                NOW(),
                NOW()
            FROM game_clusters WHERE id = v_cluster_id;
        ELSE
            -- Update existing record
            v_new_avg := (v_current.avg_score * v_current.games_played + p_score) / (v_current.games_played + 1);

            -- Calculate trend
            IF v_current.games_played >= 2 THEN
                IF p_score > v_current.avg_score + 5 THEN
                    v_new_trend := 'improving';
                ELSIF p_score < v_current.avg_score - 5 THEN
                    v_new_trend := 'declining';
                ELSE
                    v_new_trend := 'stable';
                END IF;
            ELSE
                v_new_trend := 'new';
            END IF;

            -- Calculate improvement rate
            IF v_current.first_score > 0 THEN
                v_improvement := ((p_score - v_current.first_score)::FLOAT / v_current.first_score) * 100;
            ELSE
                v_improvement := 0;
            END IF;

            UPDATE player_skill_clusters
            SET
                games_played = v_current.games_played + 1,
                completion_rate = (v_current.games_played + 1)::FLOAT / v_current.total_games_in_cluster,
                best_score = GREATEST(v_current.best_score, p_score),
                latest_score = p_score,
                avg_score = v_new_avg,
                score_trend = v_new_trend,
                improvement_rate = v_improvement,
                last_played_at = NOW(),
                updated_at = NOW()
            WHERE player_id = p_player_id AND cluster_id = v_cluster_id;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- FUNCTION: log_cross_game_progression
-- Log skill transfer between related games
-- ============================================================================

CREATE OR REPLACE FUNCTION log_cross_game_progression(
    p_player_id TEXT,
    p_from_game_id TEXT,
    p_from_score INT,
    p_from_played_at TIMESTAMP WITH TIME ZONE,
    p_to_game_id TEXT,
    p_to_score INT,
    p_to_played_at TIMESTAMP WITH TIME ZONE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_similarity FLOAT;
    v_transfer_effectiveness FLOAT;
    v_days_between INT;
    v_skill_transferred BOOLEAN;
    v_id UUID;
BEGIN
    -- Get similarity between games
    SELECT overall_similarity INTO v_similarity
    FROM game_similarity_pairs
    WHERE (game_id_a = p_from_game_id AND game_id_b = p_to_game_id)
       OR (game_id_a = p_to_game_id AND game_id_b = p_from_game_id);

    IF v_similarity IS NULL THEN
        v_similarity := 0;
    END IF;

    -- Calculate days between games
    v_days_between := EXTRACT(DAY FROM (p_to_played_at - p_from_played_at));

    -- Calculate transfer effectiveness
    -- Positive if second game score is higher than expected given similarity
    IF v_similarity > 0.5 THEN
        -- For similar games, expect scores to be close
        v_transfer_effectiveness := (p_to_score - p_from_score)::FLOAT / 100;
        v_skill_transferred := p_to_score >= p_from_score - 10;
    ELSE
        -- For different games, just check if maintaining performance
        v_transfer_effectiveness := (p_to_score - 50)::FLOAT / 50;
        v_skill_transferred := p_to_score >= 50;
    END IF;

    -- Clamp to -1 to 1
    v_transfer_effectiveness := GREATEST(-1, LEAST(1, v_transfer_effectiveness));

    INSERT INTO cross_game_progression (
        player_id,
        from_game_id,
        to_game_id,
        game_similarity,
        from_score,
        to_score,
        score_change,
        skill_transferred,
        transfer_effectiveness,
        time_between_games,
        days_between,
        from_played_at,
        to_played_at
    ) VALUES (
        p_player_id,
        p_from_game_id,
        p_to_game_id,
        v_similarity,
        p_from_score,
        p_to_score,
        p_to_score - p_from_score,
        v_skill_transferred,
        v_transfer_effectiveness,
        p_to_played_at - p_from_played_at,
        v_days_between,
        p_from_played_at,
        p_to_played_at
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ============================================================================
-- FUNCTION: get_recommended_games
-- Get personalized game recommendations based on cluster progress
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recommended_games(
    p_player_id TEXT,
    p_current_game_id TEXT DEFAULT NULL,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    game_id TEXT,
    game_title TEXT,
    skill_category TEXT,
    difficulty TEXT,
    recommendation_reason TEXT,
    similarity_score FLOAT,
    priority INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH player_progress AS (
        -- Get player's cluster progress
        SELECT
            gc.game_ids,
            gc.primary_skill,
            psc.avg_score,
            psc.score_trend,
            psc.games_played
        FROM player_skill_clusters psc
        JOIN game_clusters gc ON psc.cluster_id = gc.id
        WHERE psc.player_id = p_player_id
    ),
    played_games AS (
        -- Get games the player has already played
        SELECT DISTINCT unnest(game_ids) AS game_id
        FROM player_progress
    ),
    similar_to_current AS (
        -- If current game provided, get similar games
        SELECT
            sg.game_id,
            sg.game_title,
            sg.skill_category,
            sg.difficulty,
            sg.similarity
        FROM find_similar_games(p_current_game_id, 10, 0.3) sg
        WHERE p_current_game_id IS NOT NULL
    )
    -- Combine recommendations
    SELECT DISTINCT ON (ge.game_id)
        ge.game_id,
        ge.game_title,
        ge.skill_category,
        ge.difficulty,
        CASE
            WHEN stc.game_id IS NOT NULL THEN 'Similar to current game'
            WHEN pp.avg_score >= 80 THEN 'Challenge in your strong area'
            WHEN pp.avg_score < 60 THEN 'Practice in growth area'
            ELSE 'Recommended for skill building'
        END AS recommendation_reason,
        COALESCE(stc.similarity, 0.5) AS similarity_score,
        CASE
            WHEN stc.game_id IS NOT NULL THEN 1
            WHEN pp.avg_score < 60 THEN 2
            WHEN pp.avg_score >= 80 THEN 3
            ELSE 4
        END AS priority
    FROM game_embeddings ge
    LEFT JOIN similar_to_current stc ON stc.game_id = ge.game_id
    LEFT JOIN player_progress pp ON ge.skill_category = pp.primary_skill
    WHERE ge.game_id NOT IN (SELECT pg.game_id FROM played_games pg)
      AND (p_current_game_id IS NULL OR ge.game_id != p_current_game_id)
    ORDER BY ge.game_id, priority, similarity_score DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: compute_game_similarity_batch
-- Compute similarity between all game pairs (for batch updates)
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_game_similarity_batch()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT := 0;
    v_game_a RECORD;
    v_game_b RECORD;
    v_content_sim FLOAT;
    v_skill_sim FLOAT;
    v_diff_sim FLOAT;
    v_overall_sim FLOAT;
    v_relationship TEXT;
BEGIN
    -- Clear existing pairs
    DELETE FROM game_similarity_pairs;

    -- Compute all pairs
    FOR v_game_a IN SELECT * FROM game_embeddings WHERE content_embedding IS NOT NULL
    LOOP
        FOR v_game_b IN
            SELECT * FROM game_embeddings
            WHERE content_embedding IS NOT NULL
              AND game_id > v_game_a.game_id
        LOOP
            -- Content similarity from embeddings
            v_content_sim := 1 - (v_game_a.content_embedding <=> v_game_b.content_embedding);

            -- Skill similarity
            IF v_game_a.skill_category = v_game_b.skill_category THEN
                v_skill_sim := 1.0;
            ELSE
                v_skill_sim := 0.3; -- Some transfer between skills
            END IF;

            -- Difficulty similarity
            v_diff_sim := CASE
                WHEN v_game_a.difficulty = v_game_b.difficulty THEN 1.0
                WHEN (v_game_a.difficulty IN ('easy', 'medium') AND v_game_b.difficulty IN ('easy', 'medium'))
                  OR (v_game_a.difficulty IN ('medium', 'hard') AND v_game_b.difficulty IN ('medium', 'hard')) THEN 0.7
                ELSE 0.4
            END;

            -- Overall similarity (weighted)
            v_overall_sim := (v_content_sim * 0.5) + (v_skill_sim * 0.35) + (v_diff_sim * 0.15);

            -- Determine relationship type
            v_relationship := CASE
                WHEN v_skill_sim = 1.0 AND v_game_a.difficulty < v_game_b.difficulty THEN 'prerequisite'
                WHEN v_skill_sim = 1.0 AND v_game_a.difficulty > v_game_b.difficulty THEN 'advanced'
                WHEN v_skill_sim = 1.0 AND v_game_a.difficulty = v_game_b.difficulty THEN 'parallel'
                WHEN v_content_sim > 0.7 THEN 'variation'
                ELSE 'related'
            END;

            INSERT INTO game_similarity_pairs (
                game_id_a,
                game_id_b,
                overall_similarity,
                content_similarity,
                skill_similarity,
                difficulty_similarity,
                relationship_type
            ) VALUES (
                v_game_a.game_id,
                v_game_b.game_id,
                v_overall_sim,
                v_content_sim,
                v_skill_sim,
                v_diff_sim,
                v_relationship
            );

            v_count := v_count + 1;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ============================================================================
-- Create initial clusters based on skill categories
-- ============================================================================

-- This will be populated by the application when games are loaded

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE game_embeddings IS 'Stores embedding vectors for game content for similarity calculations';
COMMENT ON TABLE game_clusters IS 'Pre-computed clusters of similar games for skill progression tracking';
COMMENT ON TABLE game_similarity_pairs IS 'Pre-computed similarity scores between all game pairs';
COMMENT ON TABLE player_skill_clusters IS 'Tracks player progress within game clusters';
COMMENT ON TABLE cross_game_progression IS 'Tracks how skills transfer across related games';
COMMENT ON FUNCTION find_similar_games IS 'Find games similar to a given game using vector similarity';
COMMENT ON FUNCTION get_player_cluster_progress IS 'Get a player progress across all skill clusters';
COMMENT ON FUNCTION update_player_cluster_progress IS 'Update player progress after completing a game';
COMMENT ON FUNCTION log_cross_game_progression IS 'Log skill transfer between related games';
COMMENT ON FUNCTION get_recommended_games IS 'Get personalized game recommendations based on cluster progress';
