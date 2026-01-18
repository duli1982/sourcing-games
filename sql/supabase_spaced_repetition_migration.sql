-- ============================================================================
-- Spaced Repetition Migration
-- Version: 1.0.0
--
-- Implements spaced repetition for weak skills based on learning science.
-- Uses SM-2 algorithm principles adapted for skill-based learning.
-- ============================================================================

-- ============================================================================
-- TABLE: player_skill_memory
-- Tracks memory strength and review schedule for each skill per player
-- Uses SM-2 algorithm parameters (easiness factor, interval, repetitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_skill_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,
    skill_category TEXT NOT NULL,

    -- SM-2 Algorithm Parameters
    easiness_factor FLOAT DEFAULT 2.5, -- EF: 1.3-2.5, how easy the skill is for the player
    interval_days FLOAT DEFAULT 1,      -- Current interval between reviews
    repetitions INT DEFAULT 0,          -- Number of successful reviews in a row
    last_quality INT,                   -- Last performance quality (0-5 in SM-2)

    -- Skill Mastery Tracking
    current_score FLOAT DEFAULT 0,      -- Most recent score (0-100)
    avg_score FLOAT DEFAULT 0,          -- Average score over all attempts
    best_score INT DEFAULT 0,           -- Best score achieved
    total_attempts INT DEFAULT 0,       -- Total attempts for this skill
    successful_attempts INT DEFAULT 0,   -- Attempts scoring >= 70

    -- Memory Decay Tracking
    memory_strength FLOAT DEFAULT 0.5,  -- Current estimated retention (0-1)
    decay_rate FLOAT DEFAULT 0.1,       -- How fast memory decays for this skill
    stability FLOAT DEFAULT 1,          -- Memory stability (higher = slower decay)

    -- Review Schedule
    next_review_date TIMESTAMP WITH TIME ZONE, -- When to suggest reviewing this skill
    is_due_for_review BOOLEAN DEFAULT false,
    days_overdue FLOAT DEFAULT 0,
    priority_score FLOAT DEFAULT 0,     -- Higher = more urgent to review

    -- Skill Classification
    skill_status TEXT DEFAULT 'learning', -- 'new', 'learning', 'reviewing', 'mastered', 'weak'
    weakness_level TEXT,                  -- 'slight', 'moderate', 'significant', 'critical'
    needs_attention BOOLEAN DEFAULT false,

    -- Historical Performance
    score_history INT[] DEFAULT '{}',   -- Last 10 scores
    review_dates TIMESTAMP WITH TIME ZONE[] DEFAULT '{}', -- Last 10 review dates
    improvement_trend TEXT DEFAULT 'stable', -- 'improving', 'stable', 'declining'

    -- Timestamps
    first_attempt_at TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_player_skill UNIQUE (player_id, skill_category)
);

CREATE INDEX IF NOT EXISTS idx_skill_memory_player ON player_skill_memory(player_id);
CREATE INDEX IF NOT EXISTS idx_skill_memory_skill ON player_skill_memory(skill_category);
CREATE INDEX IF NOT EXISTS idx_skill_memory_due ON player_skill_memory(next_review_date) WHERE is_due_for_review = true;
CREATE INDEX IF NOT EXISTS idx_skill_memory_weak ON player_skill_memory(weakness_level) WHERE needs_attention = true;
CREATE INDEX IF NOT EXISTS idx_skill_memory_priority ON player_skill_memory(priority_score DESC);

-- ============================================================================
-- TABLE: skill_review_log
-- Logs each review/practice session for analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_review_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,
    skill_category TEXT NOT NULL,
    game_id TEXT NOT NULL,

    -- Review Details
    score INT NOT NULL,
    quality_rating INT NOT NULL, -- 0-5 (SM-2 quality)
    was_scheduled BOOLEAN DEFAULT false, -- Was this a scheduled review?
    was_overdue BOOLEAN DEFAULT false,
    days_since_last_review FLOAT,

    -- Before/After Memory State
    prev_easiness_factor FLOAT,
    new_easiness_factor FLOAT,
    prev_interval FLOAT,
    new_interval FLOAT,
    prev_memory_strength FLOAT,
    new_memory_strength FLOAT,

    -- Context
    time_spent_ms INT,
    attempt_number INT,
    was_improvement BOOLEAN DEFAULT false,

    -- Timestamps
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_log_player ON skill_review_log(player_id);
CREATE INDEX IF NOT EXISTS idx_review_log_skill ON skill_review_log(skill_category);
CREATE INDEX IF NOT EXISTS idx_review_log_date ON skill_review_log(reviewed_at);

-- ============================================================================
-- TABLE: spaced_repetition_recommendations
-- Stores personalized game recommendations based on spaced repetition
-- ============================================================================

CREATE TABLE IF NOT EXISTS spaced_repetition_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,

    -- Recommendation Details
    recommended_game_id TEXT NOT NULL,
    recommended_game_title TEXT NOT NULL,
    skill_category TEXT NOT NULL,
    difficulty TEXT NOT NULL,

    -- Reason for Recommendation
    recommendation_type TEXT NOT NULL, -- 'due_review', 'weak_skill', 'overdue', 'reinforcement', 'challenge'
    recommendation_reason TEXT NOT NULL,
    priority INT DEFAULT 0, -- Higher = more important

    -- Timing
    optimal_review_date TIMESTAMP WITH TIME ZONE,
    urgency_level TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'

    -- Prediction
    predicted_score_min INT,
    predicted_score_max INT,
    predicted_difficulty_match TEXT, -- 'too_easy', 'appropriate', 'challenging', 'too_hard'

    -- Status
    is_active BOOLEAN DEFAULT true,
    was_followed BOOLEAN DEFAULT false,
    actual_score INT,
    was_helpful BOOLEAN,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    followed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sr_recommendations_player ON spaced_repetition_recommendations(player_id);
CREATE INDEX IF NOT EXISTS idx_sr_recommendations_active ON spaced_repetition_recommendations(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_sr_recommendations_skill ON spaced_repetition_recommendations(skill_category);

-- ============================================================================
-- TABLE: optimal_intervals
-- Stores calibrated optimal review intervals based on aggregate data
-- ============================================================================

CREATE TABLE IF NOT EXISTS optimal_intervals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    performance_level TEXT NOT NULL, -- 'low' (0-40), 'medium' (41-70), 'high' (71-100)

    -- Optimal Intervals (in days)
    first_review_interval FLOAT DEFAULT 1,   -- After first attempt
    second_review_interval FLOAT DEFAULT 3,  -- After successful first review
    third_review_interval FLOAT DEFAULT 7,   -- After successful second review
    subsequent_multiplier FLOAT DEFAULT 2.0, -- Multiply interval by this after each success

    -- Decay Parameters
    base_decay_rate FLOAT DEFAULT 0.1,
    retention_target FLOAT DEFAULT 0.8, -- Target 80% retention

    -- Calibration
    sample_size INT DEFAULT 0,
    avg_actual_retention FLOAT,
    is_calibrated BOOLEAN DEFAULT false,

    -- Timestamps
    last_calibrated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_interval_config UNIQUE (skill_category, difficulty, performance_level)
);

-- Insert default optimal intervals
INSERT INTO optimal_intervals (skill_category, difficulty, performance_level, first_review_interval, second_review_interval, third_review_interval, subsequent_multiplier) VALUES
    -- Boolean search
    ('boolean', 'easy', 'low', 1, 2, 4, 1.5),
    ('boolean', 'easy', 'medium', 2, 4, 7, 2.0),
    ('boolean', 'easy', 'high', 3, 7, 14, 2.5),
    ('boolean', 'medium', 'low', 1, 2, 3, 1.3),
    ('boolean', 'medium', 'medium', 1, 3, 6, 1.8),
    ('boolean', 'medium', 'high', 2, 5, 10, 2.2),
    ('boolean', 'hard', 'low', 0.5, 1, 2, 1.2),
    ('boolean', 'hard', 'medium', 1, 2, 4, 1.5),
    ('boolean', 'hard', 'high', 1, 3, 7, 2.0),

    -- Default for other skills (will be calibrated over time)
    ('general', 'easy', 'low', 1, 2, 4, 1.5),
    ('general', 'easy', 'medium', 2, 4, 7, 2.0),
    ('general', 'easy', 'high', 3, 7, 14, 2.5),
    ('general', 'medium', 'low', 1, 2, 3, 1.3),
    ('general', 'medium', 'medium', 1, 3, 6, 1.8),
    ('general', 'medium', 'high', 2, 5, 10, 2.2),
    ('general', 'hard', 'low', 0.5, 1, 2, 1.2),
    ('general', 'hard', 'medium', 1, 2, 4, 1.5),
    ('general', 'hard', 'high', 1, 3, 7, 2.0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTION: calculate_sm2_update
-- Implements the SM-2 algorithm for updating memory parameters
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_sm2_update(
    p_score INT,           -- Score 0-100
    p_current_ef FLOAT,    -- Current easiness factor
    p_current_interval FLOAT, -- Current interval
    p_current_reps INT     -- Current repetition count
)
RETURNS TABLE (
    quality INT,
    new_ef FLOAT,
    new_interval FLOAT,
    new_reps INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_quality INT;
    v_new_ef FLOAT;
    v_new_interval FLOAT;
    v_new_reps INT;
BEGIN
    -- Convert score to SM-2 quality (0-5)
    -- 0-2: failure, 3-5: success
    v_quality := CASE
        WHEN p_score >= 90 THEN 5  -- Perfect response
        WHEN p_score >= 80 THEN 4  -- Correct with hesitation
        WHEN p_score >= 70 THEN 3  -- Correct with difficulty
        WHEN p_score >= 50 THEN 2  -- Incorrect but remembered
        WHEN p_score >= 30 THEN 1  -- Incorrect with partial recall
        ELSE 0                      -- Complete blackout
    END;

    -- Calculate new easiness factor (EF)
    -- EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    v_new_ef := p_current_ef + (0.1 - (5 - v_quality) * (0.08 + (5 - v_quality) * 0.02));
    v_new_ef := GREATEST(1.3, v_new_ef); -- EF minimum is 1.3

    -- Calculate new interval and repetitions
    IF v_quality >= 3 THEN
        -- Successful review
        v_new_reps := p_current_reps + 1;

        IF v_new_reps = 1 THEN
            v_new_interval := 1;
        ELSIF v_new_reps = 2 THEN
            v_new_interval := 3;
        ELSE
            v_new_interval := p_current_interval * v_new_ef;
        END IF;
    ELSE
        -- Failed review - reset
        v_new_reps := 0;
        v_new_interval := 1;
    END IF;

    RETURN QUERY SELECT v_quality, v_new_ef, v_new_interval, v_new_reps;
END;
$$;

-- ============================================================================
-- FUNCTION: update_skill_memory
-- Updates a player's skill memory after an attempt
-- ============================================================================

CREATE OR REPLACE FUNCTION update_skill_memory(
    p_player_id TEXT,
    p_skill_category TEXT,
    p_game_id TEXT,
    p_score INT
)
RETURNS TABLE (
    skill_status TEXT,
    weakness_level TEXT,
    next_review_date TIMESTAMP WITH TIME ZONE,
    priority_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current RECORD;
    v_sm2 RECORD;
    v_memory_strength FLOAT;
    v_stability FLOAT;
    v_weakness TEXT;
    v_status TEXT;
    v_priority FLOAT;
    v_next_review TIMESTAMP WITH TIME ZONE;
    v_days_since_last FLOAT;
BEGIN
    -- Get current memory state or create new
    SELECT * INTO v_current
    FROM player_skill_memory
    WHERE player_id = p_player_id AND skill_category = p_skill_category;

    -- Calculate SM-2 update
    SELECT * INTO v_sm2
    FROM calculate_sm2_update(
        p_score,
        COALESCE(v_current.easiness_factor, 2.5),
        COALESCE(v_current.interval_days, 1),
        COALESCE(v_current.repetitions, 0)
    );

    -- Calculate memory strength (exponential decay model)
    IF v_current IS NOT NULL AND v_current.last_attempt_at IS NOT NULL THEN
        v_days_since_last := EXTRACT(EPOCH FROM (NOW() - v_current.last_attempt_at)) / 86400;
        v_memory_strength := EXP(-COALESCE(v_current.decay_rate, 0.1) * v_days_since_last / COALESCE(v_current.stability, 1));
    ELSE
        v_memory_strength := 0.5;
        v_days_since_last := NULL;
    END IF;

    -- Adjust memory strength based on current performance
    v_memory_strength := (v_memory_strength * 0.3) + ((p_score / 100.0) * 0.7);

    -- Calculate stability (improves with consistent good performance)
    v_stability := COALESCE(v_current.stability, 1) + CASE
        WHEN p_score >= 80 THEN 0.1
        WHEN p_score >= 60 THEN 0.05
        WHEN p_score >= 40 THEN 0
        ELSE -0.1
    END;
    v_stability := GREATEST(0.5, LEAST(5, v_stability));

    -- Determine weakness level
    v_weakness := CASE
        WHEN COALESCE(v_current.avg_score, p_score) < 40 THEN 'critical'
        WHEN COALESCE(v_current.avg_score, p_score) < 55 THEN 'significant'
        WHEN COALESCE(v_current.avg_score, p_score) < 70 THEN 'moderate'
        WHEN COALESCE(v_current.avg_score, p_score) < 80 THEN 'slight'
        ELSE NULL
    END;

    -- Determine skill status
    v_status := CASE
        WHEN COALESCE(v_current.total_attempts, 0) = 0 THEN 'new'
        WHEN COALESCE(v_current.avg_score, p_score) >= 85 AND COALESCE(v_current.repetitions, 0) >= 3 THEN 'mastered'
        WHEN v_weakness IS NOT NULL THEN 'weak'
        WHEN COALESCE(v_current.repetitions, 0) >= 2 THEN 'reviewing'
        ELSE 'learning'
    END;

    -- Calculate next review date
    v_next_review := NOW() + (v_sm2.new_interval || ' days')::INTERVAL;

    -- Calculate priority score (higher = more urgent)
    -- Factors: weakness level, time overdue, memory strength
    v_priority := CASE v_weakness
        WHEN 'critical' THEN 100
        WHEN 'significant' THEN 75
        WHEN 'moderate' THEN 50
        WHEN 'slight' THEN 25
        ELSE 0
    END;

    -- Add urgency for overdue reviews
    IF v_current IS NOT NULL AND v_current.next_review_date < NOW() THEN
        v_priority := v_priority + LEAST(50, EXTRACT(EPOCH FROM (NOW() - v_current.next_review_date)) / 86400 * 5);
    END IF;

    -- Reduce priority based on memory strength
    v_priority := v_priority * (1 - v_memory_strength * 0.3);

    -- Upsert skill memory
    INSERT INTO player_skill_memory (
        player_id, skill_category,
        easiness_factor, interval_days, repetitions, last_quality,
        current_score, avg_score, best_score, total_attempts, successful_attempts,
        memory_strength, decay_rate, stability,
        next_review_date, is_due_for_review, priority_score,
        skill_status, weakness_level, needs_attention,
        score_history, improvement_trend,
        first_attempt_at, last_attempt_at, updated_at
    )
    VALUES (
        p_player_id, p_skill_category,
        v_sm2.new_ef, v_sm2.new_interval, v_sm2.new_reps, v_sm2.quality,
        p_score,
        p_score, -- Will be updated below if exists
        p_score,
        1,
        CASE WHEN p_score >= 70 THEN 1 ELSE 0 END,
        v_memory_strength,
        0.1,
        v_stability,
        v_next_review,
        false,
        v_priority,
        v_status,
        v_weakness,
        v_weakness IS NOT NULL,
        ARRAY[p_score],
        'stable',
        NOW(), NOW(), NOW()
    )
    ON CONFLICT (player_id, skill_category) DO UPDATE SET
        easiness_factor = v_sm2.new_ef,
        interval_days = v_sm2.new_interval,
        repetitions = v_sm2.new_reps,
        last_quality = v_sm2.quality,
        current_score = p_score,
        avg_score = (player_skill_memory.avg_score * player_skill_memory.total_attempts + p_score) / (player_skill_memory.total_attempts + 1),
        best_score = GREATEST(player_skill_memory.best_score, p_score),
        total_attempts = player_skill_memory.total_attempts + 1,
        successful_attempts = player_skill_memory.successful_attempts + CASE WHEN p_score >= 70 THEN 1 ELSE 0 END,
        memory_strength = v_memory_strength,
        stability = v_stability,
        next_review_date = v_next_review,
        is_due_for_review = false,
        priority_score = v_priority,
        skill_status = v_status,
        weakness_level = v_weakness,
        needs_attention = v_weakness IS NOT NULL,
        score_history = (ARRAY[p_score] || player_skill_memory.score_history)[1:10],
        improvement_trend = CASE
            WHEN p_score > player_skill_memory.current_score + 5 THEN 'improving'
            WHEN p_score < player_skill_memory.current_score - 5 THEN 'declining'
            ELSE 'stable'
        END,
        last_attempt_at = NOW(),
        updated_at = NOW();

    -- Log the review
    INSERT INTO skill_review_log (
        player_id, skill_category, game_id, score, quality_rating,
        was_scheduled, was_overdue, days_since_last_review,
        prev_easiness_factor, new_easiness_factor,
        prev_interval, new_interval,
        prev_memory_strength, new_memory_strength,
        was_improvement
    )
    VALUES (
        p_player_id, p_skill_category, p_game_id, p_score, v_sm2.quality,
        v_current IS NOT NULL AND v_current.is_due_for_review,
        v_current IS NOT NULL AND v_current.next_review_date < NOW(),
        v_days_since_last,
        v_current.easiness_factor, v_sm2.new_ef,
        v_current.interval_days, v_sm2.new_interval,
        v_current.memory_strength, v_memory_strength,
        v_current IS NOT NULL AND p_score > v_current.current_score
    );

    RETURN QUERY SELECT v_status, v_weakness, v_next_review, v_priority;
END;
$$;

-- ============================================================================
-- FUNCTION: get_due_reviews
-- Gets skills that are due for review for a player
-- ============================================================================

CREATE OR REPLACE FUNCTION get_due_reviews(
    p_player_id TEXT,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    skill_category TEXT,
    days_overdue FLOAT,
    memory_strength FLOAT,
    priority_score FLOAT,
    last_score INT,
    avg_score FLOAT,
    weakness_level TEXT,
    review_urgency TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update is_due_for_review flag
    UPDATE player_skill_memory SET
        is_due_for_review = next_review_date <= NOW(),
        days_overdue = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - next_review_date)) / 86400)
    WHERE player_id = p_player_id;

    RETURN QUERY
    SELECT
        psm.skill_category,
        psm.days_overdue,
        psm.memory_strength,
        psm.priority_score,
        psm.current_score::INT,
        psm.avg_score,
        psm.weakness_level,
        CASE
            WHEN psm.days_overdue > 7 THEN 'critical'
            WHEN psm.days_overdue > 3 THEN 'high'
            WHEN psm.days_overdue > 1 THEN 'normal'
            ELSE 'low'
        END as review_urgency
    FROM player_skill_memory psm
    WHERE psm.player_id = p_player_id
      AND (psm.is_due_for_review = true OR psm.needs_attention = true)
    ORDER BY psm.priority_score DESC, psm.days_overdue DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: get_weak_skills
-- Gets skills where the player is struggling
-- ============================================================================

CREATE OR REPLACE FUNCTION get_weak_skills(
    p_player_id TEXT,
    p_min_attempts INT DEFAULT 2
)
RETURNS TABLE (
    skill_category TEXT,
    weakness_level TEXT,
    avg_score FLOAT,
    total_attempts INT,
    improvement_trend TEXT,
    suggested_action TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        psm.skill_category,
        psm.weakness_level,
        psm.avg_score,
        psm.total_attempts,
        psm.improvement_trend,
        CASE psm.weakness_level
            WHEN 'critical' THEN 'Start with easier games in this skill'
            WHEN 'significant' THEN 'Focus on understanding core concepts'
            WHEN 'moderate' THEN 'Practice regularly to build consistency'
            WHEN 'slight' THEN 'A few more attempts should help'
            ELSE 'Keep practicing!'
        END as suggested_action
    FROM player_skill_memory psm
    WHERE psm.player_id = p_player_id
      AND psm.weakness_level IS NOT NULL
      AND psm.total_attempts >= p_min_attempts
    ORDER BY
        CASE psm.weakness_level
            WHEN 'critical' THEN 1
            WHEN 'significant' THEN 2
            WHEN 'moderate' THEN 3
            WHEN 'slight' THEN 4
            ELSE 5
        END,
        psm.avg_score ASC;
END;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE player_skill_memory IS 'Tracks memory strength and review schedule using SM-2 algorithm';
COMMENT ON TABLE skill_review_log IS 'Logs each review/practice session';
COMMENT ON TABLE spaced_repetition_recommendations IS 'Stores personalized game recommendations';
COMMENT ON TABLE optimal_intervals IS 'Calibrated optimal review intervals';
COMMENT ON FUNCTION calculate_sm2_update IS 'Implements SM-2 algorithm for memory update';
COMMENT ON FUNCTION update_skill_memory IS 'Updates player skill memory after attempt';
COMMENT ON FUNCTION get_due_reviews IS 'Gets skills due for review';
COMMENT ON FUNCTION get_weak_skills IS 'Gets skills where player is struggling';
