-- ============================================================================
-- Adaptive Difficulty System Migration
-- Version: 1.0.0
--
-- Creates tables and functions for:
-- 1. Tracking player difficulty readiness per skill
-- 2. Game difficulty calibration data
-- 3. Personalized game recommendations
-- 4. Difficulty-based performance analytics
-- ============================================================================

-- ============================================================================
-- TABLE: player_difficulty_profile
-- Tracks player's readiness for each difficulty level per skill
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_difficulty_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,

    -- Skill and difficulty tracking
    skill_category TEXT NOT NULL,
    difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'

    -- Performance metrics at this level
    attempts INT DEFAULT 0,
    total_score INT DEFAULT 0,
    avg_score FLOAT DEFAULT 0,
    best_score INT DEFAULT 0,
    worst_score INT DEFAULT 100,

    -- Mastery indicators
    mastery_score FLOAT DEFAULT 0, -- 0-100, weighted score indicating readiness for next level
    games_above_80 INT DEFAULT 0,
    games_above_90 INT DEFAULT 0,
    consecutive_high_scores INT DEFAULT 0, -- Streak of 75+ scores
    last_high_score_streak INT DEFAULT 0,

    -- Readiness for next difficulty
    ready_for_next BOOLEAN DEFAULT false,
    readiness_confidence FLOAT DEFAULT 0, -- 0-1, how confident we are in the assessment

    -- Time tracking
    first_attempt_at TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    time_to_mastery_hours FLOAT, -- Hours from first attempt to mastery

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_player_skill_difficulty UNIQUE (player_id, skill_category, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_difficulty_profile_player ON player_difficulty_profile(player_id);
CREATE INDEX IF NOT EXISTS idx_difficulty_profile_skill ON player_difficulty_profile(skill_category);
CREATE INDEX IF NOT EXISTS idx_difficulty_profile_mastery ON player_difficulty_profile(mastery_score DESC);

-- ============================================================================
-- TABLE: game_difficulty_calibration
-- Tracks actual difficulty of games based on player performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_difficulty_calibration (
    game_id TEXT PRIMARY KEY,
    game_title TEXT NOT NULL,
    skill_category TEXT NOT NULL,

    -- Stated vs actual difficulty
    stated_difficulty TEXT NOT NULL, -- What we say it is
    calibrated_difficulty FLOAT, -- Calculated actual difficulty (0-100)
    difficulty_variance FLOAT, -- How much scores vary

    -- Score distribution
    total_attempts INT DEFAULT 0,
    avg_score FLOAT,
    median_score FLOAT,
    score_std_dev FLOAT,
    min_score INT,
    max_score INT,

    -- Performance by player level
    beginner_avg_score FLOAT,
    intermediate_avg_score FLOAT,
    advanced_avg_score FLOAT,
    expert_avg_score FLOAT,

    -- Percentile thresholds
    p10_score INT, -- 10th percentile (hard for most)
    p25_score INT,
    p50_score INT, -- Median
    p75_score INT,
    p90_score INT, -- 90th percentile (easy for most)

    -- Difficulty flags
    is_outlier BOOLEAN DEFAULT false, -- Difficulty doesn't match stated level
    needs_review BOOLEAN DEFAULT false,
    calibration_confidence FLOAT DEFAULT 0, -- Confidence in calibration (based on sample size)

    -- Timestamps
    last_calibrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_skill ON game_difficulty_calibration(skill_category);
CREATE INDEX IF NOT EXISTS idx_calibration_difficulty ON game_difficulty_calibration(stated_difficulty);

-- ============================================================================
-- TABLE: player_game_recommendations
-- Stores personalized game recommendations for each player
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_game_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,
    game_id TEXT NOT NULL,

    -- Recommendation metadata
    recommendation_type TEXT NOT NULL, -- 'next_challenge', 'practice', 'stretch_goal', 'consolidation'
    recommendation_reason TEXT,
    priority INT DEFAULT 0, -- Higher = more recommended

    -- Difficulty assessment
    predicted_score_min INT,
    predicted_score_max INT,
    difficulty_match TEXT, -- 'too_easy', 'just_right', 'challenging', 'too_hard'
    confidence FLOAT DEFAULT 0.5,

    -- Skill development
    skill_gap_addressed TEXT[], -- Skills this game would help develop
    builds_on_games TEXT[], -- Games whose skills this builds on

    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    was_played BOOLEAN DEFAULT false,
    actual_score INT, -- Score if played (for feedback loop)

    -- Timestamps
    recommended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    played_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT unique_player_game_rec UNIQUE (player_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_player ON player_game_recommendations(player_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_active ON player_game_recommendations(player_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON player_game_recommendations(priority DESC);

-- ============================================================================
-- TABLE: difficulty_transitions
-- Tracks when players move between difficulty levels
-- ============================================================================

CREATE TABLE IF NOT EXISTS difficulty_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,
    skill_category TEXT NOT NULL,

    -- Transition details
    from_difficulty TEXT NOT NULL,
    to_difficulty TEXT NOT NULL,
    transition_type TEXT NOT NULL, -- 'promotion', 'demotion', 'lateral'

    -- Performance context
    games_at_previous_level INT,
    avg_score_at_previous_level FLOAT,
    trigger_score INT, -- Score that triggered the transition
    trigger_game_id TEXT,

    -- Outcome tracking
    first_score_at_new_level INT,
    adaptation_success BOOLEAN, -- Did they perform well at new level?

    -- Timestamps
    transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transitions_player ON difficulty_transitions(player_id);
CREATE INDEX IF NOT EXISTS idx_transitions_skill ON difficulty_transitions(skill_category);

-- ============================================================================
-- FUNCTION: update_difficulty_profile
-- Updates a player's difficulty profile after an attempt
-- ============================================================================

CREATE OR REPLACE FUNCTION update_difficulty_profile(
    p_player_id TEXT,
    p_skill_category TEXT,
    p_difficulty TEXT,
    p_score INT
)
RETURNS TABLE (
    mastery_score FLOAT,
    ready_for_next BOOLEAN,
    should_demote BOOLEAN,
    recommendation TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile RECORD;
    v_new_mastery FLOAT;
    v_ready BOOLEAN;
    v_demote BOOLEAN;
    v_recommendation TEXT;
    v_new_avg FLOAT;
    v_consecutive INT;
BEGIN
    -- Get or create profile
    SELECT * INTO v_profile
    FROM player_difficulty_profile pdp
    WHERE pdp.player_id = p_player_id
      AND pdp.skill_category = p_skill_category
      AND pdp.difficulty = p_difficulty;

    IF NOT FOUND THEN
        -- Create new profile
        INSERT INTO player_difficulty_profile (
            player_id, skill_category, difficulty,
            attempts, total_score, avg_score, best_score, worst_score,
            games_above_80, games_above_90, consecutive_high_scores,
            first_attempt_at, last_attempt_at
        ) VALUES (
            p_player_id, p_skill_category, p_difficulty,
            1, p_score, p_score, p_score, p_score,
            CASE WHEN p_score >= 80 THEN 1 ELSE 0 END,
            CASE WHEN p_score >= 90 THEN 1 ELSE 0 END,
            CASE WHEN p_score >= 75 THEN 1 ELSE 0 END,
            NOW(), NOW()
        )
        RETURNING * INTO v_profile;
    ELSE
        -- Update existing profile
        v_new_avg := (v_profile.total_score + p_score)::FLOAT / (v_profile.attempts + 1);

        -- Track consecutive high scores
        IF p_score >= 75 THEN
            v_consecutive := v_profile.consecutive_high_scores + 1;
        ELSE
            v_consecutive := 0;
        END IF;

        UPDATE player_difficulty_profile
        SET
            attempts = attempts + 1,
            total_score = total_score + p_score,
            avg_score = v_new_avg,
            best_score = GREATEST(best_score, p_score),
            worst_score = LEAST(worst_score, p_score),
            games_above_80 = games_above_80 + CASE WHEN p_score >= 80 THEN 1 ELSE 0 END,
            games_above_90 = games_above_90 + CASE WHEN p_score >= 90 THEN 1 ELSE 0 END,
            consecutive_high_scores = v_consecutive,
            last_high_score_streak = GREATEST(last_high_score_streak, v_consecutive),
            last_attempt_at = NOW(),
            updated_at = NOW()
        WHERE player_id = p_player_id
          AND skill_category = p_skill_category
          AND difficulty = p_difficulty
        RETURNING * INTO v_profile;
    END IF;

    -- Calculate mastery score (weighted formula)
    -- Factors: avg_score (40%), consistency (20%), high score ratio (20%), streak (20%)
    v_new_mastery := (
        (v_profile.avg_score * 0.4) +
        (CASE WHEN v_profile.attempts > 0
            THEN (1 - (v_profile.best_score - v_profile.worst_score)::FLOAT / 100) * 20
            ELSE 10 END) +
        (CASE WHEN v_profile.attempts > 0
            THEN (v_profile.games_above_80::FLOAT / v_profile.attempts) * 20
            ELSE 0 END) +
        (LEAST(v_profile.consecutive_high_scores, 5)::FLOAT / 5 * 20)
    );

    -- Determine if ready for next level
    v_ready := (
        v_profile.attempts >= 3 AND
        v_profile.avg_score >= 75 AND
        v_profile.games_above_80 >= 2 AND
        v_profile.consecutive_high_scores >= 2
    );

    -- Determine if should demote
    v_demote := (
        v_profile.attempts >= 3 AND
        v_profile.avg_score < 50 AND
        p_difficulty != 'easy'
    );

    -- Generate recommendation
    IF v_demote THEN
        v_recommendation := 'Consider practicing at a lower difficulty level';
    ELSIF v_ready AND p_difficulty != 'hard' THEN
        v_recommendation := 'Ready for more challenging games!';
    ELSIF v_profile.avg_score >= 85 THEN
        v_recommendation := 'Excellent mastery - try pushing to harder games';
    ELSIF v_profile.avg_score >= 70 THEN
        v_recommendation := 'Good progress - keep practicing at this level';
    ELSIF v_profile.avg_score >= 50 THEN
        v_recommendation := 'Building skills - focus on fundamentals';
    ELSE
        v_recommendation := 'Consider reviewing basics and trying easier games';
    END IF;

    -- Update mastery score and readiness
    UPDATE player_difficulty_profile
    SET
        mastery_score = v_new_mastery,
        ready_for_next = v_ready,
        readiness_confidence = LEAST(v_profile.attempts::FLOAT / 10, 1)
    WHERE player_id = p_player_id
      AND skill_category = p_skill_category
      AND difficulty = p_difficulty;

    RETURN QUERY SELECT v_new_mastery, v_ready, v_demote, v_recommendation;
END;
$$;

-- ============================================================================
-- FUNCTION: get_recommended_difficulty
-- Determines the optimal difficulty for a player in a skill category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recommended_difficulty(
    p_player_id TEXT,
    p_skill_category TEXT
)
RETURNS TABLE (
    recommended_difficulty TEXT,
    confidence FLOAT,
    reasoning TEXT,
    alternative_difficulty TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_easy RECORD;
    v_medium RECORD;
    v_hard RECORD;
    v_rec_diff TEXT;
    v_confidence FLOAT;
    v_reason TEXT;
    v_alt TEXT;
BEGIN
    -- Get profiles for each difficulty
    SELECT * INTO v_easy FROM player_difficulty_profile
    WHERE player_id = p_player_id AND skill_category = p_skill_category AND difficulty = 'easy';

    SELECT * INTO v_medium FROM player_difficulty_profile
    WHERE player_id = p_player_id AND skill_category = p_skill_category AND difficulty = 'medium';

    SELECT * INTO v_hard FROM player_difficulty_profile
    WHERE player_id = p_player_id AND skill_category = p_skill_category AND difficulty = 'hard';

    -- Decision tree for recommendation
    IF v_hard IS NOT NULL AND v_hard.avg_score >= 70 AND v_hard.attempts >= 2 THEN
        -- Already succeeding at hard
        v_rec_diff := 'hard';
        v_confidence := 0.9;
        v_reason := 'Strong performance at hard difficulty';
        v_alt := 'hard';
    ELSIF v_medium IS NOT NULL AND v_medium.ready_for_next THEN
        -- Ready to move up from medium
        v_rec_diff := 'hard';
        v_confidence := 0.7;
        v_reason := 'Mastered medium difficulty, ready for challenge';
        v_alt := 'medium';
    ELSIF v_medium IS NOT NULL AND v_medium.avg_score >= 60 AND v_medium.attempts >= 2 THEN
        -- Comfortable at medium
        v_rec_diff := 'medium';
        v_confidence := 0.8;
        v_reason := 'Solid performance at medium difficulty';
        v_alt := CASE WHEN v_medium.avg_score >= 75 THEN 'hard' ELSE 'easy' END;
    ELSIF v_easy IS NOT NULL AND v_easy.ready_for_next THEN
        -- Ready to move up from easy
        v_rec_diff := 'medium';
        v_confidence := 0.7;
        v_reason := 'Mastered easy difficulty, ready for medium';
        v_alt := 'easy';
    ELSIF v_easy IS NOT NULL AND v_easy.avg_score >= 70 AND v_easy.attempts >= 2 THEN
        -- Comfortable at easy
        v_rec_diff := 'medium';
        v_confidence := 0.6;
        v_reason := 'Good progress at easy, try medium';
        v_alt := 'easy';
    ELSIF v_medium IS NOT NULL AND v_medium.avg_score < 50 THEN
        -- Struggling at medium
        v_rec_diff := 'easy';
        v_confidence := 0.7;
        v_reason := 'Building fundamentals at easier level recommended';
        v_alt := 'medium';
    ELSIF v_easy IS NULL AND v_medium IS NULL AND v_hard IS NULL THEN
        -- No history - start at easy
        v_rec_diff := 'easy';
        v_confidence := 0.5;
        v_reason := 'New player - start with fundamentals';
        v_alt := 'medium';
    ELSE
        -- Default to medium
        v_rec_diff := 'medium';
        v_confidence := 0.5;
        v_reason := 'Balanced difficulty recommendation';
        v_alt := 'easy';
    END IF;

    RETURN QUERY SELECT v_rec_diff, v_confidence, v_reason, v_alt;
END;
$$;

-- ============================================================================
-- FUNCTION: get_player_difficulty_summary
-- Gets a summary of player's difficulty profile across all skills
-- ============================================================================

CREATE OR REPLACE FUNCTION get_player_difficulty_summary(p_player_id TEXT)
RETURNS TABLE (
    skill_category TEXT,
    current_level TEXT,
    mastery_at_current FLOAT,
    ready_for_next BOOLEAN,
    total_attempts INT,
    avg_score FLOAT,
    recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH skill_summary AS (
        SELECT
            pdp.skill_category,
            pdp.difficulty,
            pdp.mastery_score,
            pdp.ready_for_next,
            pdp.attempts,
            pdp.avg_score,
            ROW_NUMBER() OVER (
                PARTITION BY pdp.skill_category
                ORDER BY
                    CASE pdp.difficulty WHEN 'hard' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
                    pdp.attempts DESC
            ) as rn
        FROM player_difficulty_profile pdp
        WHERE pdp.player_id = p_player_id
    )
    SELECT
        ss.skill_category,
        ss.difficulty AS current_level,
        ss.mastery_score AS mastery_at_current,
        ss.ready_for_next,
        ss.attempts AS total_attempts,
        ss.avg_score,
        CASE
            WHEN ss.ready_for_next AND ss.difficulty != 'hard' THEN 'Ready for next level!'
            WHEN ss.avg_score >= 80 THEN 'Excellent - consider harder games'
            WHEN ss.avg_score >= 60 THEN 'Good progress - keep practicing'
            WHEN ss.avg_score >= 40 THEN 'Building skills - focus on fundamentals'
            ELSE 'Consider easier games to build confidence'
        END AS recommendation
    FROM skill_summary ss
    WHERE ss.rn = 1
    ORDER BY ss.mastery_score DESC;
END;
$$;

-- ============================================================================
-- FUNCTION: calibrate_game_difficulty
-- Updates game difficulty calibration based on accumulated scores
-- ============================================================================

CREATE OR REPLACE FUNCTION calibrate_game_difficulty(p_game_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_stats RECORD;
    v_calibrated FLOAT;
    v_is_outlier BOOLEAN;
BEGIN
    -- Calculate statistics from scoring_analytics
    SELECT
        COUNT(*) as total,
        AVG(final_score) as avg_score,
        STDDEV(final_score) as std_dev,
        MIN(final_score) as min_score,
        MAX(final_score) as max_score,
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY final_score) as p10,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY final_score) as p25,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_score) as p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY final_score) as p75,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY final_score) as p90
    INTO v_stats
    FROM scoring_analytics
    WHERE game_id = p_game_id;

    IF v_stats.total < 5 THEN
        -- Not enough data to calibrate
        RETURN;
    END IF;

    -- Calculate calibrated difficulty (inverse of avg score)
    -- Higher scores = easier game, Lower scores = harder game
    v_calibrated := 100 - v_stats.avg_score;

    -- Check if outlier compared to stated difficulty
    -- (This would need the stated difficulty from game_difficulty_calibration)

    -- Update or insert calibration
    INSERT INTO game_difficulty_calibration (
        game_id, game_title, skill_category, stated_difficulty,
        calibrated_difficulty, difficulty_variance,
        total_attempts, avg_score, median_score, score_std_dev,
        min_score, max_score,
        p10_score, p25_score, p50_score, p75_score, p90_score,
        calibration_confidence, last_calibrated_at
    )
    SELECT
        p_game_id,
        COALESCE((SELECT game_title FROM scoring_analytics WHERE game_id = p_game_id LIMIT 1), p_game_id),
        COALESCE((SELECT skill_category FROM scoring_analytics WHERE game_id = p_game_id LIMIT 1), 'general'),
        'medium', -- Default, should be updated from game data
        v_calibrated,
        v_stats.std_dev,
        v_stats.total,
        v_stats.avg_score,
        v_stats.p50,
        v_stats.std_dev,
        v_stats.min_score,
        v_stats.max_score,
        v_stats.p10,
        v_stats.p25,
        v_stats.p50,
        v_stats.p75,
        v_stats.p90,
        LEAST(v_stats.total::FLOAT / 50, 1), -- Confidence based on sample size
        NOW()
    ON CONFLICT (game_id) DO UPDATE SET
        calibrated_difficulty = EXCLUDED.calibrated_difficulty,
        difficulty_variance = EXCLUDED.difficulty_variance,
        total_attempts = EXCLUDED.total_attempts,
        avg_score = EXCLUDED.avg_score,
        median_score = EXCLUDED.median_score,
        score_std_dev = EXCLUDED.score_std_dev,
        min_score = EXCLUDED.min_score,
        max_score = EXCLUDED.max_score,
        p10_score = EXCLUDED.p10_score,
        p25_score = EXCLUDED.p25_score,
        p50_score = EXCLUDED.p50_score,
        p75_score = EXCLUDED.p75_score,
        p90_score = EXCLUDED.p90_score,
        calibration_confidence = EXCLUDED.calibration_confidence,
        last_calibrated_at = NOW(),
        updated_at = NOW();
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE player_difficulty_profile IS 'Tracks player mastery at each difficulty level per skill';
COMMENT ON TABLE game_difficulty_calibration IS 'Actual difficulty of games based on player performance';
COMMENT ON TABLE player_game_recommendations IS 'Personalized game recommendations for players';
COMMENT ON TABLE difficulty_transitions IS 'History of player difficulty level changes';
COMMENT ON FUNCTION update_difficulty_profile IS 'Updates player difficulty profile after an attempt';
COMMENT ON FUNCTION get_recommended_difficulty IS 'Gets optimal difficulty for a player in a skill';
COMMENT ON FUNCTION get_player_difficulty_summary IS 'Summary of player difficulty across all skills';
