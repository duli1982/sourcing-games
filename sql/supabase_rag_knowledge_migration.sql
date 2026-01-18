-- ============================================================================
-- RAG Knowledge Base Migration
-- Version: 1.0.0
--
-- Creates tables and functions for storing and retrieving sourcing domain
-- knowledge that the AI can reference when scoring submissions.
-- ============================================================================

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE: knowledge_articles
-- Main knowledge base storing sourcing best practices and domain expertise
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content identification
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'boolean', 'outreach', 'linkedin', 'diversity', 'general', etc.
    subcategory TEXT, -- More specific categorization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- The actual knowledge content
    content TEXT NOT NULL, -- Main knowledge content
    summary TEXT, -- Short summary for quick reference
    key_points TEXT[], -- Bullet points of key takeaways

    -- Examples and anti-patterns
    good_examples TEXT[], -- Examples of good practice
    bad_examples TEXT[], -- Common mistakes to avoid
    common_mistakes TEXT[], -- Frequent errors in this area

    -- Embedding for semantic search
    content_embedding VECTOR(1536),

    -- Quality and usage metadata
    source TEXT, -- Where this knowledge came from
    source_url TEXT,
    quality_score FLOAT DEFAULT 0.8, -- 0-1 rating of article quality
    usage_count INT DEFAULT 0, -- How often this has been retrieved
    helpfulness_rating FLOAT, -- Aggregated user feedback

    -- Skill level targeting
    skill_levels TEXT[] DEFAULT ARRAY['beginner', 'intermediate', 'expert']::TEXT[],

    -- Status and timestamps
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false, -- Reviewed by human expert
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_subcategory ON knowledge_articles(subcategory);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge_articles(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_articles
    USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 50);

-- ============================================================================
-- TABLE: knowledge_chunks
-- Smaller chunks of knowledge for more precise retrieval
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES knowledge_articles(id) ON DELETE CASCADE,

    -- Chunk content
    chunk_index INT NOT NULL, -- Order within the article
    chunk_text TEXT NOT NULL,
    chunk_type TEXT DEFAULT 'content', -- 'content', 'example', 'mistake', 'tip'

    -- Embedding for semantic search
    chunk_embedding VECTOR(1536),

    -- Metadata
    token_count INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_article ON knowledge_chunks(article_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON knowledge_chunks
    USING ivfflat (chunk_embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- TABLE: knowledge_retrieval_log
-- Track what knowledge was retrieved for each scoring request
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_retrieval_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id TEXT, -- Links to scoring_analytics
    game_id TEXT NOT NULL,
    skill_category TEXT NOT NULL,

    -- What was retrieved
    query_text TEXT, -- The submission or query used
    articles_retrieved UUID[], -- Array of article IDs
    chunks_retrieved UUID[], -- Array of chunk IDs
    total_retrieved INT,

    -- Relevance metrics
    avg_similarity FLOAT,
    max_similarity FLOAT,
    retrieval_time_ms INT,

    -- Outcome tracking
    final_score INT,
    was_helpful BOOLEAN, -- User feedback

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_game ON knowledge_retrieval_log(game_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_skill ON knowledge_retrieval_log(skill_category);
CREATE INDEX IF NOT EXISTS idx_retrieval_date ON knowledge_retrieval_log(created_at);

-- ============================================================================
-- FUNCTION: search_knowledge
-- Semantic search for relevant knowledge articles
-- ============================================================================

CREATE OR REPLACE FUNCTION search_knowledge(
    p_query_embedding VECTOR(1536),
    p_category TEXT DEFAULT NULL,
    p_skill_level TEXT DEFAULT 'intermediate',
    p_limit INT DEFAULT 5,
    p_min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    article_id UUID,
    title TEXT,
    category TEXT,
    content TEXT,
    summary TEXT,
    key_points TEXT[],
    good_examples TEXT[],
    common_mistakes TEXT[],
    similarity FLOAT,
    quality_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ka.id AS article_id,
        ka.title,
        ka.category,
        ka.content,
        ka.summary,
        ka.key_points,
        ka.good_examples,
        ka.common_mistakes,
        (1 - (ka.content_embedding <=> p_query_embedding))::FLOAT AS similarity,
        ka.quality_score
    FROM knowledge_articles ka
    WHERE ka.is_active = true
      AND ka.content_embedding IS NOT NULL
      AND (p_category IS NULL OR ka.category = p_category)
      AND (p_skill_level = ANY(ka.skill_levels))
      AND (1 - (ka.content_embedding <=> p_query_embedding)) >= p_min_similarity
    ORDER BY ka.content_embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: search_knowledge_chunks
-- Fine-grained search for specific knowledge chunks
-- ============================================================================

CREATE OR REPLACE FUNCTION search_knowledge_chunks(
    p_query_embedding VECTOR(1536),
    p_category TEXT DEFAULT NULL,
    p_chunk_types TEXT[] DEFAULT ARRAY['content', 'example', 'tip']::TEXT[],
    p_limit INT DEFAULT 10,
    p_min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    chunk_id UUID,
    article_id UUID,
    article_title TEXT,
    chunk_text TEXT,
    chunk_type TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id AS chunk_id,
        kc.article_id,
        ka.title AS article_title,
        kc.chunk_text,
        kc.chunk_type,
        (1 - (kc.chunk_embedding <=> p_query_embedding))::FLOAT AS similarity
    FROM knowledge_chunks kc
    JOIN knowledge_articles ka ON kc.article_id = ka.id
    WHERE ka.is_active = true
      AND kc.chunk_embedding IS NOT NULL
      AND (p_category IS NULL OR ka.category = p_category)
      AND kc.chunk_type = ANY(p_chunk_types)
      AND (1 - (kc.chunk_embedding <=> p_query_embedding)) >= p_min_similarity
    ORDER BY kc.chunk_embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: get_knowledge_by_category
-- Get all knowledge for a specific category (for pre-loading)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_knowledge_by_category(
    p_category TEXT,
    p_include_examples BOOLEAN DEFAULT true,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    article_id UUID,
    title TEXT,
    summary TEXT,
    key_points TEXT[],
    good_examples TEXT[],
    common_mistakes TEXT[],
    quality_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ka.id AS article_id,
        ka.title,
        ka.summary,
        ka.key_points,
        CASE WHEN p_include_examples THEN ka.good_examples ELSE NULL END AS good_examples,
        ka.common_mistakes,
        ka.quality_score
    FROM knowledge_articles ka
    WHERE ka.is_active = true
      AND ka.category = p_category
    ORDER BY ka.quality_score DESC, ka.usage_count DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: increment_usage_count
-- Track article usage for popularity metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage_count(p_article_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE knowledge_articles
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = ANY(p_article_ids);
END;
$$;

-- ============================================================================
-- FUNCTION: log_knowledge_retrieval
-- Log what knowledge was retrieved for analytics
-- ============================================================================

CREATE OR REPLACE FUNCTION log_knowledge_retrieval(
    p_attempt_id TEXT,
    p_game_id TEXT,
    p_skill_category TEXT,
    p_query_text TEXT,
    p_articles_retrieved UUID[],
    p_chunks_retrieved UUID[],
    p_avg_similarity FLOAT,
    p_max_similarity FLOAT,
    p_retrieval_time_ms INT,
    p_final_score INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO knowledge_retrieval_log (
        attempt_id,
        game_id,
        skill_category,
        query_text,
        articles_retrieved,
        chunks_retrieved,
        total_retrieved,
        avg_similarity,
        max_similarity,
        retrieval_time_ms,
        final_score
    ) VALUES (
        p_attempt_id,
        p_game_id,
        p_skill_category,
        p_query_text,
        p_articles_retrieved,
        p_chunks_retrieved,
        COALESCE(array_length(p_articles_retrieved, 1), 0) + COALESCE(array_length(p_chunks_retrieved, 1), 0),
        p_avg_similarity,
        p_max_similarity,
        p_retrieval_time_ms,
        p_final_score
    )
    RETURNING id INTO v_id;

    -- Increment usage counts for retrieved articles
    IF p_articles_retrieved IS NOT NULL AND array_length(p_articles_retrieved, 1) > 0 THEN
        PERFORM increment_usage_count(p_articles_retrieved);
    END IF;

    RETURN v_id;
END;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE knowledge_articles IS 'Main knowledge base storing sourcing domain expertise for RAG';
COMMENT ON TABLE knowledge_chunks IS 'Smaller chunks of knowledge for fine-grained retrieval';
COMMENT ON TABLE knowledge_retrieval_log IS 'Tracks knowledge retrieval for analytics and improvement';
COMMENT ON FUNCTION search_knowledge IS 'Semantic search for relevant knowledge articles';
COMMENT ON FUNCTION search_knowledge_chunks IS 'Fine-grained search for specific knowledge chunks';
COMMENT ON FUNCTION get_knowledge_by_category IS 'Get all knowledge for a specific category';
