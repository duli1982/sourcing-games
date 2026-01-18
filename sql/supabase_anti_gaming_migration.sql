-- ============================================================================
-- Anti-Gaming Detection Migration
-- Version: 1.0.0
--
-- Enhanced integrity checks to detect sophisticated gaming attempts:
-- - Keyword stuffing
-- - Template copying
-- - AI-generated submissions
-- - Cross-submission pattern analysis
-- ============================================================================

-- ============================================================================
-- TABLE: gaming_detection_log
-- Logs all gaming detection results for analysis and improvement
-- ============================================================================

CREATE TABLE IF NOT EXISTS gaming_detection_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Attempt identification
    attempt_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    game_id TEXT NOT NULL,

    -- Detection results
    overall_risk TEXT NOT NULL CHECK (overall_risk IN ('none', 'low', 'medium', 'high', 'critical')),
    risk_score FLOAT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),

    -- Individual detection scores (0-100)
    keyword_stuffing_score FLOAT DEFAULT 0,
    template_match_score FLOAT DEFAULT 0,
    ai_generated_score FLOAT DEFAULT 0,
    copy_paste_score FLOAT DEFAULT 0,
    low_effort_score FLOAT DEFAULT 0,
    pattern_gaming_score FLOAT DEFAULT 0,

    -- Detection flags (what triggered)
    flags TEXT[] DEFAULT '{}',

    -- Detailed signals
    signals JSONB DEFAULT '{}',

    -- Action taken
    score_penalty_applied INT DEFAULT 0,
    was_flagged_for_review BOOLEAN DEFAULT false,
    was_auto_rejected BOOLEAN DEFAULT false,

    -- Submission metadata
    submission_length INT,
    submission_word_count INT,
    unique_word_ratio FLOAT,
    avg_sentence_length FLOAT,

    -- Original and adjusted scores
    original_score INT,
    adjusted_score INT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gaming_log_player ON gaming_detection_log(player_id);
CREATE INDEX IF NOT EXISTS idx_gaming_log_game ON gaming_detection_log(game_id);
CREATE INDEX IF NOT EXISTS idx_gaming_log_risk ON gaming_detection_log(overall_risk);
CREATE INDEX IF NOT EXISTS idx_gaming_log_flagged ON gaming_detection_log(was_flagged_for_review) WHERE was_flagged_for_review = true;

-- ============================================================================
-- TABLE: known_templates
-- Stores known templates and common copied responses to detect
-- ============================================================================

CREATE TABLE IF NOT EXISTS known_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template identification
    template_hash TEXT NOT NULL UNIQUE, -- Hash of normalized text
    template_text TEXT NOT NULL,
    template_length INT NOT NULL,

    -- Classification
    template_type TEXT NOT NULL CHECK (template_type IN ('example_solution', 'known_cheat', 'ai_generated', 'common_copy', 'flagged_submission')),
    source TEXT, -- Where it came from

    -- Matching settings
    min_similarity_threshold FLOAT DEFAULT 0.85,
    is_active BOOLEAN DEFAULT true,

    -- Usage stats
    times_detected INT DEFAULT 0,
    last_detected_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    game_ids TEXT[], -- Which games this template applies to (null = all)
    skill_categories TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_hash ON known_templates(template_hash);
CREATE INDEX IF NOT EXISTS idx_templates_type ON known_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON known_templates(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: player_gaming_profile
-- Tracks gaming behavior patterns per player over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_gaming_profile (
    player_id TEXT PRIMARY KEY,

    -- Overall gaming indicators
    total_submissions INT DEFAULT 0,
    flagged_submissions INT DEFAULT 0,
    high_risk_submissions INT DEFAULT 0,

    -- Risk metrics
    avg_risk_score FLOAT DEFAULT 0,
    max_risk_score FLOAT DEFAULT 0,
    gaming_tendency_score FLOAT DEFAULT 0, -- 0-100, higher = more likely to game

    -- Pattern detection
    suspected_template_usage INT DEFAULT 0,
    suspected_ai_usage INT DEFAULT 0,
    suspected_copy_paste INT DEFAULT 0,

    -- Timing patterns
    avg_submission_time_ms INT,
    suspiciously_fast_submissions INT DEFAULT 0,

    -- Trust level
    trust_level TEXT DEFAULT 'normal' CHECK (trust_level IN ('trusted', 'normal', 'suspicious', 'flagged')),
    trust_score FLOAT DEFAULT 50, -- 0-100

    -- Actions taken
    warnings_issued INT DEFAULT 0,
    submissions_rejected INT DEFAULT 0,

    -- Timestamps
    first_submission_at TIMESTAMP WITH TIME ZONE,
    last_submission_at TIMESTAMP WITH TIME ZONE,
    last_flagged_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gaming_profile_trust ON player_gaming_profile(trust_level);
CREATE INDEX IF NOT EXISTS idx_gaming_profile_tendency ON player_gaming_profile(gaming_tendency_score DESC);

-- ============================================================================
-- TABLE: ai_detection_patterns
-- Stores patterns commonly found in AI-generated text
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_detection_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pattern definition
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('phrase', 'structure', 'word_choice', 'punctuation', 'formatting')),
    pattern_regex TEXT, -- Regex pattern (if applicable)
    pattern_text TEXT,  -- Exact text match (if applicable)
    pattern_description TEXT NOT NULL,

    -- Detection weight
    weight FLOAT DEFAULT 1.0, -- How much this contributes to AI detection score
    confidence FLOAT DEFAULT 0.7, -- How confident we are this indicates AI

    -- False positive management
    false_positive_rate FLOAT DEFAULT 0,
    times_triggered INT DEFAULT 0,
    times_confirmed_ai INT DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common AI detection patterns
INSERT INTO ai_detection_patterns (pattern_type, pattern_text, pattern_description, weight, confidence) VALUES
    -- Overly formal transitions
    ('phrase', 'In conclusion,', 'Formal conclusion starter common in AI text', 0.3, 0.6),
    ('phrase', 'Furthermore,', 'Formal transition common in AI text', 0.2, 0.5),
    ('phrase', 'Moreover,', 'Formal transition common in AI text', 0.2, 0.5),
    ('phrase', 'Additionally,', 'Formal transition common in AI text', 0.2, 0.5),
    ('phrase', 'It is worth noting that', 'Hedging phrase common in AI text', 0.3, 0.6),
    ('phrase', 'It is important to note that', 'Hedging phrase common in AI text', 0.3, 0.6),
    ('phrase', 'Firstly,', 'Formal enumeration common in AI text', 0.2, 0.5),
    ('phrase', 'Secondly,', 'Formal enumeration common in AI text', 0.2, 0.5),
    ('phrase', 'Lastly,', 'Formal enumeration common in AI text', 0.2, 0.5),

    -- Hedging language
    ('phrase', 'may or may not', 'Excessive hedging', 0.2, 0.5),
    ('phrase', 'it could be argued', 'Formal hedging common in AI', 0.3, 0.6),
    ('phrase', 'one might consider', 'Formal hedging common in AI', 0.3, 0.6),

    -- Generic acknowledgments
    ('phrase', 'Great question!', 'Generic AI acknowledgment', 0.5, 0.7),
    ('phrase', 'That''s a great question', 'Generic AI acknowledgment', 0.5, 0.7),
    ('phrase', 'Thank you for asking', 'Generic AI acknowledgment', 0.4, 0.6),

    -- Structural patterns
    ('structure', 'Here are', 'List introduction common in AI', 0.2, 0.4),
    ('structure', 'Let me', 'AI assistant phrasing', 0.3, 0.5),
    ('structure', 'I''d be happy to', 'AI assistant phrasing', 0.4, 0.7),
    ('structure', 'I hope this helps', 'AI closing phrase', 0.5, 0.8),
    ('structure', 'Feel free to', 'AI closing phrase', 0.3, 0.5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TABLE: keyword_density_benchmarks
-- Expected keyword densities for different skill categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_density_benchmarks (
    skill_category TEXT PRIMARY KEY,

    -- Expected keyword usage
    expected_keyword_density FLOAT NOT NULL, -- Expected % of keywords in submission
    max_healthy_density FLOAT NOT NULL,      -- Above this is suspicious
    stuffing_threshold FLOAT NOT NULL,       -- Above this is likely stuffing

    -- Common keywords for this category
    primary_keywords TEXT[] NOT NULL,
    secondary_keywords TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert keyword benchmarks for sourcing skills
INSERT INTO keyword_density_benchmarks (skill_category, expected_keyword_density, max_healthy_density, stuffing_threshold, primary_keywords, secondary_keywords) VALUES
    ('boolean', 0.08, 0.15, 0.25, ARRAY['AND', 'OR', 'NOT', 'boolean', 'search', 'operator'], ARRAY['string', 'query', 'filter', 'syntax']),
    ('xray', 0.06, 0.12, 0.20, ARRAY['site:', 'inurl:', 'filetype:', 'Google', 'x-ray'], ARRAY['search', 'LinkedIn', 'resume', 'profile']),
    ('linkedin', 0.05, 0.10, 0.18, ARRAY['LinkedIn', 'profile', 'connection', 'InMail', 'recruiter'], ARRAY['network', 'search', 'filter', 'talent']),
    ('outreach', 0.04, 0.08, 0.15, ARRAY['email', 'message', 'reach', 'connect', 'response'], ARRAY['personalize', 'subject', 'candidate', 'opportunity']),
    ('diversity', 0.05, 0.10, 0.18, ARRAY['diversity', 'inclusion', 'equity', 'DEI', 'underrepresented'], ARRAY['bias', 'representation', 'inclusive', 'belonging']),
    ('persona', 0.04, 0.08, 0.15, ARRAY['persona', 'candidate', 'profile', 'ideal', 'requirements'], ARRAY['skills', 'experience', 'background', 'qualifications']),
    ('general', 0.04, 0.08, 0.15, ARRAY['sourcing', 'recruiting', 'talent', 'candidate', 'hire'], ARRAY['search', 'pipeline', 'strategy', 'outreach'])
ON CONFLICT (skill_category) DO NOTHING;

-- ============================================================================
-- FUNCTION: update_player_gaming_profile
-- Updates player's gaming profile after each detection
-- ============================================================================

CREATE OR REPLACE FUNCTION update_player_gaming_profile(
    p_player_id TEXT,
    p_risk_score FLOAT,
    p_was_flagged BOOLEAN,
    p_detection_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO player_gaming_profile (
        player_id,
        total_submissions,
        flagged_submissions,
        high_risk_submissions,
        avg_risk_score,
        max_risk_score,
        first_submission_at,
        last_submission_at,
        updated_at
    ) VALUES (
        p_player_id,
        1,
        CASE WHEN p_was_flagged THEN 1 ELSE 0 END,
        CASE WHEN p_risk_score >= 70 THEN 1 ELSE 0 END,
        p_risk_score,
        p_risk_score,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (player_id) DO UPDATE SET
        total_submissions = player_gaming_profile.total_submissions + 1,
        flagged_submissions = player_gaming_profile.flagged_submissions + CASE WHEN p_was_flagged THEN 1 ELSE 0 END,
        high_risk_submissions = player_gaming_profile.high_risk_submissions + CASE WHEN p_risk_score >= 70 THEN 1 ELSE 0 END,
        avg_risk_score = (player_gaming_profile.avg_risk_score * player_gaming_profile.total_submissions + p_risk_score) / (player_gaming_profile.total_submissions + 1),
        max_risk_score = GREATEST(player_gaming_profile.max_risk_score, p_risk_score),
        last_submission_at = NOW(),
        last_flagged_at = CASE WHEN p_was_flagged THEN NOW() ELSE player_gaming_profile.last_flagged_at END,
        suspected_template_usage = player_gaming_profile.suspected_template_usage + CASE WHEN p_detection_type = 'template' THEN 1 ELSE 0 END,
        suspected_ai_usage = player_gaming_profile.suspected_ai_usage + CASE WHEN p_detection_type = 'ai' THEN 1 ELSE 0 END,
        suspected_copy_paste = player_gaming_profile.suspected_copy_paste + CASE WHEN p_detection_type = 'copy' THEN 1 ELSE 0 END,
        updated_at = NOW();

    -- Update trust level based on gaming tendency
    UPDATE player_gaming_profile SET
        gaming_tendency_score = LEAST(100, (
            (flagged_submissions::FLOAT / GREATEST(total_submissions, 1)) * 40 +
            (high_risk_submissions::FLOAT / GREATEST(total_submissions, 1)) * 30 +
            (avg_risk_score / 100) * 30
        )),
        trust_level = CASE
            WHEN (flagged_submissions::FLOAT / GREATEST(total_submissions, 1)) > 0.5 THEN 'flagged'
            WHEN (high_risk_submissions::FLOAT / GREATEST(total_submissions, 1)) > 0.3 THEN 'suspicious'
            WHEN (flagged_submissions::FLOAT / GREATEST(total_submissions, 1)) < 0.1 AND total_submissions >= 10 THEN 'trusted'
            ELSE 'normal'
        END,
        trust_score = GREATEST(0, LEAST(100,
            100 - gaming_tendency_score +
            CASE WHEN total_submissions >= 20 AND flagged_submissions = 0 THEN 20 ELSE 0 END
        ))
    WHERE player_id = p_player_id;
END;
$$;

-- ============================================================================
-- FUNCTION: get_gaming_statistics
-- Gets aggregate gaming detection statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_gaming_statistics()
RETURNS TABLE (
    total_submissions BIGINT,
    flagged_count BIGINT,
    flagged_rate FLOAT,
    avg_risk_score FLOAT,
    high_risk_count BIGINT,
    template_detections BIGINT,
    ai_detections BIGINT,
    keyword_stuffing_detections BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_submissions,
        COUNT(*) FILTER (WHERE was_flagged_for_review)::BIGINT as flagged_count,
        (COUNT(*) FILTER (WHERE was_flagged_for_review)::FLOAT / GREATEST(COUNT(*), 1)) as flagged_rate,
        AVG(risk_score) as avg_risk_score,
        COUNT(*) FILTER (WHERE overall_risk IN ('high', 'critical'))::BIGINT as high_risk_count,
        COUNT(*) FILTER (WHERE template_match_score > 50)::BIGINT as template_detections,
        COUNT(*) FILTER (WHERE ai_generated_score > 50)::BIGINT as ai_detections,
        COUNT(*) FILTER (WHERE keyword_stuffing_score > 50)::BIGINT as keyword_stuffing_detections
    FROM gaming_detection_log;
END;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE gaming_detection_log IS 'Logs all gaming detection results for analysis';
COMMENT ON TABLE known_templates IS 'Stores known templates and common copied responses';
COMMENT ON TABLE player_gaming_profile IS 'Tracks gaming behavior patterns per player';
COMMENT ON TABLE ai_detection_patterns IS 'Patterns commonly found in AI-generated text';
COMMENT ON TABLE keyword_density_benchmarks IS 'Expected keyword densities for skill categories';
COMMENT ON FUNCTION update_player_gaming_profile IS 'Updates player gaming profile after detection';
COMMENT ON FUNCTION get_gaming_statistics IS 'Gets aggregate gaming detection statistics';
