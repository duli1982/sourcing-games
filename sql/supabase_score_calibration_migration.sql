-- ============================================================================
-- Score Calibration & Normalization Migration
-- Version: 1.0.0
--
-- Analyzes scoring patterns across games to ensure consistent difficulty.
-- Identifies games that score too easy/hard and provides normalization.
-- ============================================================================

-- ============================================================================
-- TABLE: score_calibration
-- Stores calibration data for each game to normalize scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS score_calibration (
    game_id TEXT PRIMARY KEY,
    game_title TEXT NOT NULL,
    skill_category TEXT NOT NULL,
    stated_difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'

    -- Raw score statistics (before calibration)
    raw_avg_score FLOAT,
    raw_median_score FLOAT,
    raw_std_dev FLOAT,
    raw_p25_score FLOAT,  -- 25th percentile
    raw_p75_score FLOAT,  -- 75th percentile

    -- Expected scores based on difficulty level
    expected_avg_score FLOAT NOT NULL, -- What avg should be for this difficulty
    expected_std_dev FLOAT NOT NULL,   -- Expected spread

    -- Calibration adjustment
    calibration_offset FLOAT DEFAULT 0,    -- Points to add/subtract
    calibration_scale FLOAT DEFAULT 1.0,   -- Multiplier for spread adjustment
    calibration_method TEXT DEFAULT 'none', -- 'offset', 'scale', 'percentile', 'none'

    -- Comparison to peers (same difficulty level)
    peer_avg_score FLOAT,          -- Avg score across all games at this difficulty
    peer_std_dev FLOAT,
    deviation_from_peer FLOAT,     -- How different from peer average
    deviation_significance TEXT,   -- 'normal', 'minor', 'significant', 'extreme'

    -- Calibration status
    is_calibrated BOOLEAN DEFAULT false,
    calibration_confidence FLOAT DEFAULT 0, -- Based on sample size
    min_samples_required INT DEFAULT 30,
    sample_count INT DEFAULT 0,

    -- Flags for review
    needs_review BOOLEAN DEFAULT false,
    review_reason TEXT,
    is_anomalous BOOLEAN DEFAULT false,  -- Scores don't fit expected pattern

    -- Timestamps
    last_calibrated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_skill ON score_calibration(skill_category);
CREATE INDEX IF NOT EXISTS idx_calibration_difficulty ON score_calibration(stated_difficulty);
CREATE INDEX IF NOT EXISTS idx_calibration_needs_review ON score_calibration(needs_review) WHERE needs_review = true;

-- ============================================================================
-- TABLE: calibration_history
-- Tracks changes to calibration over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS calibration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id TEXT NOT NULL,

    -- Before values
    prev_calibration_offset FLOAT,
    prev_calibration_scale FLOAT,
    prev_raw_avg_score FLOAT,
    prev_sample_count INT,

    -- After values
    new_calibration_offset FLOAT,
    new_calibration_scale FLOAT,
    new_raw_avg_score FLOAT,
    new_sample_count INT,

    -- Change metadata
    change_reason TEXT,
    triggered_by TEXT, -- 'auto', 'manual', 'scheduled'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_history_game ON calibration_history(game_id);
CREATE INDEX IF NOT EXISTS idx_calibration_history_date ON calibration_history(created_at);

-- ============================================================================
-- TABLE: difficulty_benchmarks
-- Expected score ranges for each difficulty level
-- ============================================================================

CREATE TABLE IF NOT EXISTS difficulty_benchmarks (
    difficulty TEXT PRIMARY KEY, -- 'easy', 'medium', 'hard'

    -- Expected score distribution
    expected_avg_score FLOAT NOT NULL,
    expected_median_score FLOAT NOT NULL,
    expected_std_dev FLOAT NOT NULL,
    expected_p25 FLOAT NOT NULL,  -- 25th percentile
    expected_p75 FLOAT NOT NULL,  -- 75th percentile

    -- Acceptable ranges
    acceptable_avg_min FLOAT NOT NULL,
    acceptable_avg_max FLOAT NOT NULL,

    -- For intermediate players (baseline)
    intermediate_player_expected FLOAT NOT NULL,

    -- Thresholds for flagging
    deviation_threshold_minor FLOAT DEFAULT 5,
    deviation_threshold_significant FLOAT DEFAULT 10,
    deviation_threshold_extreme FLOAT DEFAULT 15,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default benchmarks (using project difficulty levels: easy, medium, hard)
INSERT INTO difficulty_benchmarks (
    difficulty,
    expected_avg_score, expected_median_score, expected_std_dev, expected_p25, expected_p75,
    acceptable_avg_min, acceptable_avg_max,
    intermediate_player_expected
) VALUES
    ('easy', 75, 78, 12, 68, 85, 65, 85, 80),
    ('medium', 60, 62, 15, 50, 72, 50, 70, 65),
    ('hard', 45, 48, 18, 35, 60, 35, 55, 50)
ON CONFLICT (difficulty) DO NOTHING;

-- ============================================================================
-- TABLE: calibration_runs
-- Tracks batch calibration runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS calibration_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Run statistics
    games_analyzed INT DEFAULT 0,
    games_calibrated INT DEFAULT 0,
    games_flagged INT DEFAULT 0,

    -- Aggregated findings
    avg_deviation FLOAT,
    max_deviation FLOAT,
    games_too_easy TEXT[],  -- Game IDs scoring too high
    games_too_hard TEXT[],  -- Game IDs scoring too low

    -- Run metadata
    run_type TEXT DEFAULT 'scheduled', -- 'scheduled', 'manual', 'triggered'
    triggered_by TEXT,
    run_duration_ms INT,

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- FUNCTION: calculate_game_calibration
-- Calculates calibration values for a single game
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_game_calibration(
    p_game_id TEXT,
    p_min_samples INT DEFAULT 30
)
RETURNS TABLE (
    game_id TEXT,
    raw_avg FLOAT,
    raw_std_dev FLOAT,
    expected_avg FLOAT,
    calibration_offset FLOAT,
    deviation_significance TEXT,
    needs_review BOOLEAN,
    sample_count INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_difficulty TEXT;
    v_benchmark RECORD;
    v_stats RECORD;
    v_deviation FLOAT;
BEGIN
    -- Get game stats from scoring_analytics
    SELECT
        COUNT(*)::INT as sample_count,
        AVG(final_score) as avg_score,
        STDDEV(final_score) as std_dev,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY final_score) as p25,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_score) as median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY final_score) as p75
    INTO v_stats
    FROM scoring_analytics
    WHERE scoring_analytics.game_id = p_game_id;

    -- Get game difficulty from games table or score_calibration
    SELECT stated_difficulty INTO v_difficulty
    FROM score_calibration sc
    WHERE sc.game_id = p_game_id;

    IF v_difficulty IS NULL THEN
        v_difficulty := 'medium'; -- Default
    END IF;

    -- Get benchmark for this difficulty
    SELECT * INTO v_benchmark
    FROM difficulty_benchmarks
    WHERE difficulty = v_difficulty;

    -- Calculate deviation from expected
    v_deviation := COALESCE(v_stats.avg_score, 0) - v_benchmark.expected_avg_score;

    -- Return calibration data
    RETURN QUERY SELECT
        p_game_id,
        v_stats.avg_score,
        v_stats.std_dev,
        v_benchmark.expected_avg_score,
        -v_deviation, -- Offset to apply (negative of deviation)
        CASE
            WHEN ABS(v_deviation) < v_benchmark.deviation_threshold_minor THEN 'normal'
            WHEN ABS(v_deviation) < v_benchmark.deviation_threshold_significant THEN 'minor'
            WHEN ABS(v_deviation) < v_benchmark.deviation_threshold_extreme THEN 'significant'
            ELSE 'extreme'
        END,
        ABS(v_deviation) >= v_benchmark.deviation_threshold_significant AND v_stats.sample_count >= p_min_samples,
        v_stats.sample_count;
END;
$$;

-- ============================================================================
-- FUNCTION: apply_calibration
-- Applies calibration offset to a raw score
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_calibration(
    p_game_id TEXT,
    p_raw_score INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_calibration RECORD;
    v_adjusted FLOAT;
BEGIN
    -- Get calibration data
    SELECT calibration_offset, calibration_scale, is_calibrated
    INTO v_calibration
    FROM score_calibration
    WHERE game_id = p_game_id;

    -- If not calibrated or not found, return raw score
    IF v_calibration IS NULL OR NOT v_calibration.is_calibrated THEN
        RETURN p_raw_score;
    END IF;

    -- Apply calibration: scale first, then offset
    v_adjusted := (p_raw_score * v_calibration.calibration_scale) + v_calibration.calibration_offset;

    -- Clamp to 0-100
    RETURN LEAST(100, GREATEST(0, ROUND(v_adjusted)::INT));
END;
$$;

-- ============================================================================
-- FUNCTION: get_peer_statistics
-- Gets average statistics for games at the same difficulty level
-- ============================================================================

CREATE OR REPLACE FUNCTION get_peer_statistics(
    p_difficulty TEXT,
    p_skill_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    peer_count INT,
    peer_avg_score FLOAT,
    peer_std_dev FLOAT,
    peer_median FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT sc.game_id)::INT as peer_count,
        AVG(sc.raw_avg_score) as peer_avg_score,
        AVG(sc.raw_std_dev) as peer_std_dev,
        AVG(sc.raw_median_score) as peer_median
    FROM score_calibration sc
    WHERE sc.stated_difficulty = p_difficulty
      AND sc.sample_count >= 10
      AND (p_skill_category IS NULL OR sc.skill_category = p_skill_category);
END;
$$;

-- ============================================================================
-- FUNCTION: run_calibration_analysis
-- Analyzes all games and updates calibration data
-- ============================================================================

CREATE OR REPLACE FUNCTION run_calibration_analysis()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_run_id UUID;
    v_game RECORD;
    v_stats RECORD;
    v_benchmark RECORD;
    v_games_analyzed INT := 0;
    v_games_calibrated INT := 0;
    v_games_flagged INT := 0;
    v_too_easy TEXT[] := ARRAY[]::TEXT[];
    v_too_hard TEXT[] := ARRAY[]::TEXT[];
    v_deviation FLOAT;
    v_start_time TIMESTAMP := clock_timestamp();
BEGIN
    -- Create run record
    INSERT INTO calibration_runs (run_type) VALUES ('scheduled')
    RETURNING id INTO v_run_id;

    -- Analyze each game that has scoring data
    FOR v_game IN
        SELECT DISTINCT sa.game_id, sa.game_title
        FROM scoring_analytics sa
        WHERE sa.game_id IS NOT NULL
    LOOP
        -- Get statistics for this game
        SELECT
            COUNT(*)::INT as sample_count,
            AVG(final_score) as avg_score,
            STDDEV(final_score) as std_dev,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY final_score) as p25,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_score) as median,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY final_score) as p75
        INTO v_stats
        FROM scoring_analytics
        WHERE game_id = v_game.game_id;

        v_games_analyzed := v_games_analyzed + 1;

        -- Get or create calibration record
        INSERT INTO score_calibration (game_id, game_title, skill_category, stated_difficulty, expected_avg_score, expected_std_dev)
        VALUES (v_game.game_id, v_game.game_title, 'general', 'medium', 60, 15)
        ON CONFLICT (game_id) DO NOTHING;

        -- Get benchmark for game's difficulty
        SELECT db.* INTO v_benchmark
        FROM score_calibration sc
        JOIN difficulty_benchmarks db ON db.difficulty = sc.stated_difficulty
        WHERE sc.game_id = v_game.game_id;

        IF v_benchmark IS NULL THEN
            SELECT * INTO v_benchmark FROM difficulty_benchmarks WHERE difficulty = 'medium';
        END IF;

        -- Calculate deviation
        v_deviation := COALESCE(v_stats.avg_score, 0) - v_benchmark.expected_avg_score;

        -- Update calibration record
        UPDATE score_calibration SET
            raw_avg_score = v_stats.avg_score,
            raw_median_score = v_stats.median,
            raw_std_dev = v_stats.std_dev,
            raw_p25_score = v_stats.p25,
            raw_p75_score = v_stats.p75,
            sample_count = v_stats.sample_count,
            deviation_from_peer = v_deviation,
            deviation_significance = CASE
                WHEN ABS(v_deviation) < v_benchmark.deviation_threshold_minor THEN 'normal'
                WHEN ABS(v_deviation) < v_benchmark.deviation_threshold_significant THEN 'minor'
                WHEN ABS(v_deviation) < v_benchmark.deviation_threshold_extreme THEN 'significant'
                ELSE 'extreme'
            END,
            needs_review = ABS(v_deviation) >= v_benchmark.deviation_threshold_significant AND v_stats.sample_count >= 30,
            review_reason = CASE
                WHEN v_deviation >= v_benchmark.deviation_threshold_significant THEN 'Game scoring too easy compared to difficulty level'
                WHEN v_deviation <= -v_benchmark.deviation_threshold_significant THEN 'Game scoring too hard compared to difficulty level'
                ELSE NULL
            END,
            calibration_confidence = LEAST(1.0, v_stats.sample_count / 100.0),
            updated_at = NOW()
        WHERE game_id = v_game.game_id;

        -- Track too easy/hard games
        IF v_deviation >= v_benchmark.deviation_threshold_significant THEN
            v_too_easy := array_append(v_too_easy, v_game.game_id);
            v_games_flagged := v_games_flagged + 1;
        ELSIF v_deviation <= -v_benchmark.deviation_threshold_significant THEN
            v_too_hard := array_append(v_too_hard, v_game.game_id);
            v_games_flagged := v_games_flagged + 1;
        END IF;

        -- Auto-calibrate if enough samples and significant deviation
        IF v_stats.sample_count >= 30 AND ABS(v_deviation) >= v_benchmark.deviation_threshold_minor THEN
            UPDATE score_calibration SET
                calibration_offset = -v_deviation,
                calibration_method = 'offset',
                is_calibrated = true,
                last_calibrated_at = NOW()
            WHERE game_id = v_game.game_id;
            v_games_calibrated := v_games_calibrated + 1;
        END IF;
    END LOOP;

    -- Update run record
    UPDATE calibration_runs SET
        games_analyzed = v_games_analyzed,
        games_calibrated = v_games_calibrated,
        games_flagged = v_games_flagged,
        games_too_easy = v_too_easy,
        games_too_hard = v_too_hard,
        run_duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INT,
        completed_at = NOW()
    WHERE id = v_run_id;

    RETURN v_run_id;
END;
$$;

-- ============================================================================
-- FUNCTION: get_calibration_report
-- Generates a report of calibration status across games
-- ============================================================================

CREATE OR REPLACE FUNCTION get_calibration_report()
RETURNS TABLE (
    difficulty TEXT,
    game_count INT,
    avg_deviation FLOAT,
    games_needing_review INT,
    games_calibrated INT,
    too_easy_count INT,
    too_hard_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.stated_difficulty,
        COUNT(*)::INT as game_count,
        AVG(ABS(sc.deviation_from_peer)) as avg_deviation,
        COUNT(*) FILTER (WHERE sc.needs_review)::INT as games_needing_review,
        COUNT(*) FILTER (WHERE sc.is_calibrated)::INT as games_calibrated,
        COUNT(*) FILTER (WHERE sc.deviation_from_peer > 10)::INT as too_easy_count,
        COUNT(*) FILTER (WHERE sc.deviation_from_peer < -10)::INT as too_hard_count
    FROM score_calibration sc
    GROUP BY sc.stated_difficulty
    ORDER BY
        CASE sc.stated_difficulty
            WHEN 'easy' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'hard' THEN 3
            ELSE 5
        END;
END;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE score_calibration IS 'Stores calibration data for normalizing game scores';
COMMENT ON TABLE calibration_history IS 'Tracks changes to calibration over time';
COMMENT ON TABLE difficulty_benchmarks IS 'Expected score ranges for each difficulty level';
COMMENT ON TABLE calibration_runs IS 'Logs batch calibration analysis runs';
COMMENT ON FUNCTION calculate_game_calibration IS 'Calculates calibration values for a single game';
COMMENT ON FUNCTION apply_calibration IS 'Applies calibration offset to a raw score';
COMMENT ON FUNCTION run_calibration_analysis IS 'Batch analyzes all games and updates calibration';
COMMENT ON FUNCTION get_calibration_report IS 'Generates calibration status report';
