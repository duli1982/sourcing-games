-- ============================================================================
-- Feedback Quality Monitoring Migration
-- Version: 1.0.0
--
-- Tracks which feedback leads to improved subsequent attempts.
-- Uses this data to refine AI prompts and RAG content.
-- ============================================================================

-- ============================================================================
-- TABLE: feedback_attempts
-- Links feedback given to subsequent attempts for measuring effectiveness
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Feedback identification
    feedback_id UUID NOT NULL,
    player_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    skill_category TEXT NOT NULL,

    -- Original attempt (when feedback was given)
    original_attempt_id TEXT NOT NULL,
    original_score INT NOT NULL,
    original_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Feedback content
    feedback_text TEXT NOT NULL,
    feedback_type TEXT NOT NULL, -- 'ai_generated', 'validation', 'peer_comparison', 'personalized', 'rag_enhanced'
    feedback_components JSONB DEFAULT '{}', -- Breakdown of feedback components

    -- Key points extracted from feedback
    improvement_suggestions TEXT[], -- Specific suggestions made
    strengths_mentioned TEXT[],
    weaknesses_identified TEXT[],

    -- RAG context used (if any)
    rag_articles_used TEXT[],
    rag_chunks_used TEXT[],

    -- AI prompt version used
    prompt_version TEXT,
    scoring_version TEXT,

    -- Follow-up tracking
    has_followup_attempt BOOLEAN DEFAULT false,
    followup_attempt_id TEXT,
    followup_score INT,
    followup_timestamp TIMESTAMP WITH TIME ZONE,
    score_improvement INT, -- followup_score - original_score
    improvement_percentage FLOAT,

    -- Effectiveness metrics
    feedback_effectiveness TEXT, -- 'highly_effective', 'effective', 'neutral', 'ineffective', 'counterproductive'
    effectiveness_score FLOAT, -- 0-100 normalized

    -- Time analysis
    time_to_followup_ms BIGINT,
    was_immediate_retry BOOLEAN DEFAULT false, -- < 5 minutes

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_attempts_player ON feedback_attempts(player_id);
CREATE INDEX IF NOT EXISTS idx_feedback_attempts_game ON feedback_attempts(game_id);
CREATE INDEX IF NOT EXISTS idx_feedback_attempts_skill ON feedback_attempts(skill_category);
CREATE INDEX IF NOT EXISTS idx_feedback_attempts_effectiveness ON feedback_attempts(feedback_effectiveness);
CREATE INDEX IF NOT EXISTS idx_feedback_attempts_type ON feedback_attempts(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_attempts_has_followup ON feedback_attempts(has_followup_attempt);

-- ============================================================================
-- TABLE: feedback_patterns
-- Aggregates feedback effectiveness by pattern/type
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pattern identification
    pattern_type TEXT NOT NULL, -- 'suggestion_type', 'feedback_component', 'rag_article', 'prompt_version'
    pattern_value TEXT NOT NULL, -- The specific pattern (e.g., 'boolean_operators', 'article_123', 'v2.7')
    skill_category TEXT,
    difficulty TEXT,

    -- Usage statistics
    times_used INT DEFAULT 0,
    times_followed_up INT DEFAULT 0,
    followup_rate FLOAT,

    -- Effectiveness statistics
    avg_score_improvement FLOAT,
    median_score_improvement FLOAT,
    std_dev_improvement FLOAT,
    positive_improvement_rate FLOAT, -- % of times it led to improvement
    negative_improvement_rate FLOAT, -- % of times it led to worse score

    -- Effectiveness classification
    effectiveness_rating TEXT, -- 'highly_effective', 'effective', 'neutral', 'ineffective', 'counterproductive'
    confidence_level FLOAT, -- Based on sample size

    -- Score ranges
    avg_original_score FLOAT,
    avg_followup_score FLOAT,
    best_improvement INT,
    worst_improvement INT,

    -- Recommendations
    should_increase_usage BOOLEAN DEFAULT false,
    should_decrease_usage BOOLEAN DEFAULT false,
    needs_review BOOLEAN DEFAULT false,
    review_reason TEXT,

    -- Timestamps
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_pattern UNIQUE (pattern_type, pattern_value, skill_category, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_feedback_patterns_type ON feedback_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_feedback_patterns_effectiveness ON feedback_patterns(effectiveness_rating);
CREATE INDEX IF NOT EXISTS idx_feedback_patterns_skill ON feedback_patterns(skill_category);

-- ============================================================================
-- TABLE: suggestion_effectiveness
-- Tracks effectiveness of specific improvement suggestions
-- ============================================================================

CREATE TABLE IF NOT EXISTS suggestion_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Suggestion identification
    suggestion_hash TEXT NOT NULL, -- Hash of normalized suggestion text
    suggestion_text TEXT NOT NULL,
    suggestion_category TEXT NOT NULL, -- 'technique', 'structure', 'content', 'style', 'completeness'

    -- Context
    skill_category TEXT,
    difficulty TEXT,
    score_range TEXT, -- 'low' (0-40), 'medium' (41-70), 'high' (71-100)

    -- Usage statistics
    times_given INT DEFAULT 0,
    times_followed INT DEFAULT 0,
    followup_rate FLOAT,

    -- Effectiveness
    avg_improvement FLOAT,
    positive_rate FLOAT, -- % leading to improvement
    effectiveness_score FLOAT, -- 0-100 normalized

    -- Classification
    is_effective BOOLEAN,
    confidence FLOAT,

    -- Timestamps
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_suggestion UNIQUE (suggestion_hash, skill_category, difficulty, score_range)
);

CREATE INDEX IF NOT EXISTS idx_suggestion_effectiveness_category ON suggestion_effectiveness(suggestion_category);
CREATE INDEX IF NOT EXISTS idx_suggestion_effectiveness_skill ON suggestion_effectiveness(skill_category);
CREATE INDEX IF NOT EXISTS idx_suggestion_effectiveness_effective ON suggestion_effectiveness(is_effective);

-- ============================================================================
-- TABLE: rag_content_effectiveness
-- Tracks effectiveness of RAG knowledge articles/chunks
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag_content_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content identification
    content_type TEXT NOT NULL, -- 'article', 'chunk'
    content_id TEXT NOT NULL,
    content_title TEXT,

    -- Context
    skill_category TEXT NOT NULL,
    difficulty TEXT,

    -- Usage statistics
    times_used INT DEFAULT 0,
    times_led_to_followup INT DEFAULT 0,
    followup_rate FLOAT,

    -- Effectiveness
    avg_score_when_used FLOAT,
    avg_improvement_when_used FLOAT,
    positive_improvement_rate FLOAT,

    -- Classification
    effectiveness_rating TEXT,
    should_prioritize BOOLEAN DEFAULT false,
    should_deprioritize BOOLEAN DEFAULT false,
    needs_update BOOLEAN DEFAULT false,

    -- Timestamps
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_rag_content UNIQUE (content_type, content_id, skill_category, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_rag_effectiveness_content ON rag_content_effectiveness(content_id);
CREATE INDEX IF NOT EXISTS idx_rag_effectiveness_skill ON rag_content_effectiveness(skill_category);
CREATE INDEX IF NOT EXISTS idx_rag_effectiveness_rating ON rag_content_effectiveness(effectiveness_rating);

-- ============================================================================
-- TABLE: prompt_version_effectiveness
-- Tracks effectiveness of different AI prompt versions
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompt_version_effectiveness (
    prompt_version TEXT PRIMARY KEY,

    -- Usage statistics
    total_uses INT DEFAULT 0,
    total_followups INT DEFAULT 0,
    followup_rate FLOAT,

    -- Score statistics
    avg_original_score FLOAT,
    avg_followup_score FLOAT,
    avg_improvement FLOAT,
    positive_improvement_rate FLOAT,

    -- By skill category
    effectiveness_by_skill JSONB DEFAULT '{}',

    -- By difficulty
    effectiveness_by_difficulty JSONB DEFAULT '{}',

    -- Classification
    overall_effectiveness TEXT,
    is_current_version BOOLEAN DEFAULT false,
    is_deprecated BOOLEAN DEFAULT false,

    -- Timestamps
    first_used_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: feedback_quality_summary
-- Daily/weekly aggregated feedback quality metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_quality_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Time period
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Volume metrics
    total_feedback_given INT DEFAULT 0,
    total_followup_attempts INT DEFAULT 0,
    followup_rate FLOAT,

    -- Improvement metrics
    avg_score_improvement FLOAT,
    positive_improvement_count INT DEFAULT 0,
    negative_improvement_count INT DEFAULT 0,
    no_change_count INT DEFAULT 0,
    positive_improvement_rate FLOAT,

    -- By feedback type
    effectiveness_by_type JSONB DEFAULT '{}',

    -- By skill category
    effectiveness_by_skill JSONB DEFAULT '{}',

    -- Top performers
    most_effective_suggestions TEXT[],
    least_effective_suggestions TEXT[],
    most_effective_rag_content TEXT[],

    -- Trends
    improvement_trend TEXT, -- 'improving', 'stable', 'declining'
    trend_vs_previous FLOAT, -- % change from previous period

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_summary_period ON feedback_quality_summary(period_type, period_start);

-- ============================================================================
-- FUNCTION: link_followup_attempt
-- Links a new attempt to previous feedback for the same game
-- ============================================================================

CREATE OR REPLACE FUNCTION link_followup_attempt(
    p_player_id TEXT,
    p_game_id TEXT,
    p_attempt_id TEXT,
    p_score INT
)
RETURNS TABLE (
    feedback_id UUID,
    original_score INT,
    score_improvement INT,
    was_linked BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_feedback RECORD;
    v_improvement INT;
    v_effectiveness TEXT;
    v_effectiveness_score FLOAT;
    v_time_diff BIGINT;
BEGIN
    -- Find most recent feedback for this player/game without a followup
    SELECT * INTO v_feedback
    FROM feedback_attempts fa
    WHERE fa.player_id = p_player_id
      AND fa.game_id = p_game_id
      AND fa.has_followup_attempt = false
    ORDER BY fa.original_timestamp DESC
    LIMIT 1;

    IF v_feedback IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INT, NULL::INT, false;
        RETURN;
    END IF;

    -- Calculate improvement
    v_improvement := p_score - v_feedback.original_score;

    -- Calculate time difference
    v_time_diff := EXTRACT(EPOCH FROM (NOW() - v_feedback.original_timestamp)) * 1000;

    -- Determine effectiveness
    IF v_improvement >= 20 THEN
        v_effectiveness := 'highly_effective';
        v_effectiveness_score := 100;
    ELSIF v_improvement >= 10 THEN
        v_effectiveness := 'effective';
        v_effectiveness_score := 75;
    ELSIF v_improvement >= 0 THEN
        v_effectiveness := 'neutral';
        v_effectiveness_score := 50;
    ELSIF v_improvement >= -10 THEN
        v_effectiveness := 'ineffective';
        v_effectiveness_score := 25;
    ELSE
        v_effectiveness := 'counterproductive';
        v_effectiveness_score := 0;
    END IF;

    -- Update the feedback record
    UPDATE feedback_attempts SET
        has_followup_attempt = true,
        followup_attempt_id = p_attempt_id,
        followup_score = p_score,
        followup_timestamp = NOW(),
        score_improvement = v_improvement,
        improvement_percentage = CASE WHEN original_score > 0 THEN (v_improvement::FLOAT / original_score) * 100 ELSE 0 END,
        feedback_effectiveness = v_effectiveness,
        effectiveness_score = v_effectiveness_score,
        time_to_followup_ms = v_time_diff,
        was_immediate_retry = (v_time_diff < 300000), -- 5 minutes
        updated_at = NOW()
    WHERE id = v_feedback.id;

    RETURN QUERY SELECT v_feedback.id, v_feedback.original_score, v_improvement, true;
END;
$$;

-- ============================================================================
-- FUNCTION: update_feedback_patterns
-- Updates pattern effectiveness statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION update_feedback_patterns()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update suggestion effectiveness
    INSERT INTO feedback_patterns (pattern_type, pattern_value, skill_category, difficulty,
        times_used, times_followed_up, followup_rate, avg_score_improvement,
        positive_improvement_rate, negative_improvement_rate, effectiveness_rating, confidence_level,
        last_used_at, updated_at)
    SELECT
        'suggestion_type',
        unnest(improvement_suggestions),
        skill_category,
        NULL,
        COUNT(*),
        COUNT(*) FILTER (WHERE has_followup_attempt),
        COUNT(*) FILTER (WHERE has_followup_attempt)::FLOAT / GREATEST(COUNT(*), 1),
        AVG(score_improvement) FILTER (WHERE has_followup_attempt),
        COUNT(*) FILTER (WHERE has_followup_attempt AND score_improvement > 0)::FLOAT / GREATEST(COUNT(*) FILTER (WHERE has_followup_attempt), 1),
        COUNT(*) FILTER (WHERE has_followup_attempt AND score_improvement < 0)::FLOAT / GREATEST(COUNT(*) FILTER (WHERE has_followup_attempt), 1),
        CASE
            WHEN AVG(score_improvement) FILTER (WHERE has_followup_attempt) >= 15 THEN 'highly_effective'
            WHEN AVG(score_improvement) FILTER (WHERE has_followup_attempt) >= 5 THEN 'effective'
            WHEN AVG(score_improvement) FILTER (WHERE has_followup_attempt) >= -5 THEN 'neutral'
            WHEN AVG(score_improvement) FILTER (WHERE has_followup_attempt) >= -15 THEN 'ineffective'
            ELSE 'counterproductive'
        END,
        LEAST(1.0, COUNT(*) FILTER (WHERE has_followup_attempt) / 20.0),
        MAX(original_timestamp),
        NOW()
    FROM feedback_attempts
    WHERE improvement_suggestions IS NOT NULL AND array_length(improvement_suggestions, 1) > 0
    GROUP BY unnest(improvement_suggestions), skill_category
    ON CONFLICT (pattern_type, pattern_value, skill_category, difficulty) DO UPDATE SET
        times_used = EXCLUDED.times_used,
        times_followed_up = EXCLUDED.times_followed_up,
        followup_rate = EXCLUDED.followup_rate,
        avg_score_improvement = EXCLUDED.avg_score_improvement,
        positive_improvement_rate = EXCLUDED.positive_improvement_rate,
        negative_improvement_rate = EXCLUDED.negative_improvement_rate,
        effectiveness_rating = EXCLUDED.effectiveness_rating,
        confidence_level = EXCLUDED.confidence_level,
        last_used_at = EXCLUDED.last_used_at,
        updated_at = NOW();

    -- Update feedback type effectiveness
    INSERT INTO feedback_patterns (pattern_type, pattern_value, skill_category, difficulty,
        times_used, times_followed_up, followup_rate, avg_score_improvement,
        positive_improvement_rate, effectiveness_rating, confidence_level, last_used_at, updated_at)
    SELECT
        'feedback_type',
        feedback_type,
        skill_category,
        NULL,
        COUNT(*),
        COUNT(*) FILTER (WHERE has_followup_attempt),
        COUNT(*) FILTER (WHERE has_followup_attempt)::FLOAT / GREATEST(COUNT(*), 1),
        AVG(score_improvement) FILTER (WHERE has_followup_attempt),
        COUNT(*) FILTER (WHERE has_followup_attempt AND score_improvement > 0)::FLOAT / GREATEST(COUNT(*) FILTER (WHERE has_followup_attempt), 1),
        CASE
            WHEN AVG(score_improvement) FILTER (WHERE has_followup_attempt) >= 15 THEN 'highly_effective'
            WHEN AVG(score_improvement) FILTER (WHERE has_followup_attempt) >= 5 THEN 'effective'
            WHEN AVG(score_improvement) FILTER (WHERE has_followup_attempt) >= -5 THEN 'neutral'
            ELSE 'ineffective'
        END,
        LEAST(1.0, COUNT(*) FILTER (WHERE has_followup_attempt) / 50.0),
        MAX(original_timestamp),
        NOW()
    FROM feedback_attempts
    GROUP BY feedback_type, skill_category
    ON CONFLICT (pattern_type, pattern_value, skill_category, difficulty) DO UPDATE SET
        times_used = EXCLUDED.times_used,
        times_followed_up = EXCLUDED.times_followed_up,
        followup_rate = EXCLUDED.followup_rate,
        avg_score_improvement = EXCLUDED.avg_score_improvement,
        positive_improvement_rate = EXCLUDED.positive_improvement_rate,
        effectiveness_rating = EXCLUDED.effectiveness_rating,
        confidence_level = EXCLUDED.confidence_level,
        last_used_at = EXCLUDED.last_used_at,
        updated_at = NOW();
END;
$$;

-- ============================================================================
-- FUNCTION: get_effective_suggestions
-- Returns most effective suggestions for a given context
-- ============================================================================

CREATE OR REPLACE FUNCTION get_effective_suggestions(
    p_skill_category TEXT,
    p_score_range TEXT DEFAULT NULL,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    suggestion_text TEXT,
    effectiveness_score FLOAT,
    times_effective INT,
    avg_improvement FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.suggestion_text,
        se.effectiveness_score,
        (se.times_followed * se.positive_rate)::INT as times_effective,
        se.avg_improvement
    FROM suggestion_effectiveness se
    WHERE se.skill_category = p_skill_category
      AND (p_score_range IS NULL OR se.score_range = p_score_range)
      AND se.is_effective = true
      AND se.times_followed >= 3
    ORDER BY se.effectiveness_score DESC, se.times_followed DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: get_feedback_quality_report
-- Generates a comprehensive feedback quality report
-- ============================================================================

CREATE OR REPLACE FUNCTION get_feedback_quality_report(
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    total_feedback INT,
    followup_rate FLOAT,
    avg_improvement FLOAT,
    positive_rate FLOAT,
    most_effective_type TEXT,
    least_effective_type TEXT,
    needs_attention_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT as total_feedback,
        COUNT(*) FILTER (WHERE has_followup_attempt)::FLOAT / GREATEST(COUNT(*), 1) as followup_rate,
        AVG(score_improvement) FILTER (WHERE has_followup_attempt) as avg_improvement,
        COUNT(*) FILTER (WHERE has_followup_attempt AND score_improvement > 0)::FLOAT /
            GREATEST(COUNT(*) FILTER (WHERE has_followup_attempt), 1) as positive_rate,
        (SELECT feedback_type FROM feedback_attempts
         WHERE has_followup_attempt AND created_at > NOW() - (p_days || ' days')::INTERVAL
         GROUP BY feedback_type ORDER BY AVG(score_improvement) DESC LIMIT 1) as most_effective_type,
        (SELECT feedback_type FROM feedback_attempts
         WHERE has_followup_attempt AND created_at > NOW() - (p_days || ' days')::INTERVAL
         GROUP BY feedback_type ORDER BY AVG(score_improvement) ASC LIMIT 1) as least_effective_type,
        (SELECT COUNT(*) FROM feedback_patterns WHERE effectiveness_rating IN ('ineffective', 'counterproductive'))::INT as needs_attention_count
    FROM feedback_attempts
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE feedback_attempts IS 'Links feedback to subsequent attempts for measuring effectiveness';
COMMENT ON TABLE feedback_patterns IS 'Aggregates feedback effectiveness by pattern/type';
COMMENT ON TABLE suggestion_effectiveness IS 'Tracks effectiveness of specific improvement suggestions';
COMMENT ON TABLE rag_content_effectiveness IS 'Tracks effectiveness of RAG knowledge content';
COMMENT ON TABLE prompt_version_effectiveness IS 'Tracks effectiveness of different AI prompt versions';
COMMENT ON TABLE feedback_quality_summary IS 'Daily/weekly aggregated feedback quality metrics';
COMMENT ON FUNCTION link_followup_attempt IS 'Links a new attempt to previous feedback';
COMMENT ON FUNCTION update_feedback_patterns IS 'Updates pattern effectiveness statistics';
COMMENT ON FUNCTION get_effective_suggestions IS 'Returns most effective suggestions for context';
COMMENT ON FUNCTION get_feedback_quality_report IS 'Generates comprehensive feedback quality report';
