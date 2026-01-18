/**
 * Reference Answers Service
 *
 * Manages the multi-reference embedding database for enhanced scoring.
 * High-scoring submissions are stored with their embeddings to enable
 * comparison against multiple good answers, not just one example.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface ReferenceAnswer {
  id: string;
  gameId: string;
  gameTitle: string;
  submission: string;
  score: number;
  embedding: number[];
  sourceType: 'player' | 'example' | 'curated';
  sourcePlayerId?: string;
  sourcePlayerName?: string;
  isActive: boolean;
  isVerified: boolean;
  skillCategory?: string;
  difficulty?: string;
  aiScore?: number;
  validationScore?: number;
  embeddingSimilarity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SimilarReference {
  id: string;
  gameId: string;
  submission: string;
  score: number;
  similarity: number;
  sourceType: string;
  isVerified: boolean;
}

export interface ReferenceStats {
  totalReferences: number;
  verifiedCount: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  playerSubmissions: number;
  exampleSubmissions: number;
}

export interface MultiReferenceScoreResult {
  averageSimilarity: number;
  bestMatchSimilarity: number;
  bestMatchScore: number;
  matchCount: number;
  weightedScore: number;
  percentileEstimate: number;
  references: SimilarReference[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const REFERENCE_CONFIG = {
  // Minimum score to be considered as a reference
  minScoreThreshold: 80,

  // How many references to compare against
  maxReferencesToCompare: 10,

  // Minimum similarity to count as a "match"
  minSimilarityThreshold: 0.70,

  // Weight of multi-reference score in ensemble (adjusts dynamically)
  baseWeight: 0.10,

  // Bonus weight when we have many high-quality references
  bonusWeightPerVerified: 0.01,
  maxBonusWeight: 0.05,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert embedding array to pgvector format string
 */
const toPgVector = (embedding: number[]): string => {
  return `[${embedding.join(',')}]`;
};

/**
 * Calculate cosine similarity between two vectors
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Find similar reference answers using cosine similarity
 */
export const findSimilarReferences = async (
  supabase: SupabaseClient,
  gameId: string,
  queryEmbedding: number[],
  options: {
    limit?: number;
    minScore?: number;
  } = {}
): Promise<SimilarReference[]> => {
  const {
    limit = REFERENCE_CONFIG.maxReferencesToCompare,
    minScore = REFERENCE_CONFIG.minScoreThreshold,
  } = options;

  try {
    // Use the RPC function for vector similarity search
    const { data, error } = await supabase.rpc('find_similar_references', {
      p_game_id: gameId,
      p_query_embedding: toPgVector(queryEmbedding),
      p_limit: limit,
      p_min_score: minScore,
    });

    if (error) {
      // If RPC fails (e.g., function doesn't exist yet), fall back to manual query
      console.warn('find_similar_references RPC failed, using fallback:', error.message);
      return await findSimilarReferencesFallback(supabase, gameId, queryEmbedding, { limit, minScore });
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      gameId: row.game_id,
      submission: row.submission,
      score: row.score,
      similarity: row.similarity,
      sourceType: row.source_type,
      isVerified: row.is_verified,
    }));
  } catch (err) {
    console.error('Error finding similar references:', err);
    return [];
  }
};

/**
 * Fallback method when pgvector RPC is not available
 * Fetches all references and calculates similarity in-memory
 */
const findSimilarReferencesFallback = async (
  supabase: SupabaseClient,
  gameId: string,
  queryEmbedding: number[],
  options: { limit: number; minScore: number }
): Promise<SimilarReference[]> => {
  try {
    const { data, error } = await supabase
      .from('reference_answers')
      .select('id, game_id, submission, score, embedding, source_type, is_verified')
      .eq('game_id', gameId)
      .eq('is_active', true)
      .gte('score', options.minScore)
      .limit(100); // Fetch more than needed for in-memory filtering

    if (error) {
      console.error('Fallback reference query failed:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Calculate similarities in memory
    const withSimilarity = data
      .filter((row: any) => row.embedding && Array.isArray(row.embedding))
      .map((row: any) => ({
        id: row.id,
        gameId: row.game_id,
        submission: row.submission,
        score: row.score,
        similarity: cosineSimilarity(queryEmbedding, row.embedding),
        sourceType: row.source_type,
        isVerified: row.is_verified,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit);

    return withSimilarity;
  } catch (err) {
    console.error('Fallback reference search failed:', err);
    return [];
  }
};

/**
 * Get reference statistics for a game
 */
export const getReferenceStats = async (
  supabase: SupabaseClient,
  gameId: string
): Promise<ReferenceStats | null> => {
  try {
    const { data, error } = await supabase.rpc('get_reference_stats', {
      p_game_id: gameId,
    });

    if (error) {
      // Fallback to manual aggregation
      const { data: refs, error: refsError } = await supabase
        .from('reference_answers')
        .select('score, is_verified, source_type')
        .eq('game_id', gameId)
        .eq('is_active', true);

      if (refsError || !refs) return null;

      const scores = refs.map((r: any) => r.score);
      return {
        totalReferences: refs.length,
        verifiedCount: refs.filter((r: any) => r.is_verified).length,
        avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        minScore: scores.length > 0 ? Math.min(...scores) : 0,
        maxScore: scores.length > 0 ? Math.max(...scores) : 0,
        playerSubmissions: refs.filter((r: any) => r.source_type === 'player').length,
        exampleSubmissions: refs.filter((r: any) => r.source_type === 'example').length,
      };
    }

    const row = data?.[0];
    return row ? {
      totalReferences: Number(row.total_references),
      verifiedCount: Number(row.verified_count),
      avgScore: Number(row.avg_score),
      minScore: row.min_score,
      maxScore: row.max_score,
      playerSubmissions: Number(row.player_submissions),
      exampleSubmissions: Number(row.example_submissions),
    } : null;
  } catch (err) {
    console.error('Error getting reference stats:', err);
    return null;
  }
};

/**
 * Add a new reference answer if it meets quality criteria and isn't a duplicate
 */
export const addReferenceAnswer = async (
  supabase: SupabaseClient,
  params: {
    gameId: string;
    gameTitle: string;
    submission: string;
    score: number;
    embedding: number[];
    sourceType?: 'player' | 'example' | 'curated';
    sourcePlayerId?: string;
    sourcePlayerName?: string;
    skillCategory?: string;
    difficulty?: string;
    aiScore?: number;
    validationScore?: number;
    embeddingSimilarity?: number;
  }
): Promise<{ added: boolean; id?: string; reason?: string }> => {
  const {
    gameId,
    gameTitle,
    submission,
    score,
    embedding,
    sourceType = 'player',
    sourcePlayerId,
    sourcePlayerName,
    skillCategory,
    difficulty,
    aiScore,
    validationScore,
    embeddingSimilarity,
  } = params;

  // Check minimum score threshold
  if (score < REFERENCE_CONFIG.minScoreThreshold) {
    return { added: false, reason: `Score ${score} below threshold ${REFERENCE_CONFIG.minScoreThreshold}` };
  }

  try {
    // Try using the RPC function first
    const { data, error } = await supabase.rpc('add_reference_answer', {
      p_game_id: gameId,
      p_game_title: gameTitle,
      p_submission: submission,
      p_score: score,
      p_embedding: toPgVector(embedding),
      p_source_type: sourceType,
      p_source_player_id: sourcePlayerId || null,
      p_source_player_name: sourcePlayerName || null,
      p_skill_category: skillCategory || null,
      p_difficulty: difficulty || null,
      p_ai_score: aiScore || null,
      p_validation_score: validationScore || null,
      p_embedding_similarity: embeddingSimilarity || null,
    });

    if (error) {
      console.warn('add_reference_answer RPC failed, using fallback:', error.message);
      return await addReferenceAnswerFallback(supabase, params);
    }

    if (data === null) {
      return { added: false, reason: 'Duplicate detected (>95% similarity to existing reference)' };
    }

    return { added: true, id: data };
  } catch (err) {
    console.error('Error adding reference answer:', err);
    return { added: false, reason: 'Database error' };
  }
};

/**
 * Fallback for adding reference when RPC is not available
 */
const addReferenceAnswerFallback = async (
  supabase: SupabaseClient,
  params: {
    gameId: string;
    gameTitle: string;
    submission: string;
    score: number;
    embedding: number[];
    sourceType?: 'player' | 'example' | 'curated';
    sourcePlayerId?: string;
    sourcePlayerName?: string;
    skillCategory?: string;
    difficulty?: string;
    aiScore?: number;
    validationScore?: number;
    embeddingSimilarity?: number;
  }
): Promise<{ added: boolean; id?: string; reason?: string }> => {
  try {
    // Check for duplicates first
    const { data: existing } = await supabase
      .from('reference_answers')
      .select('id, embedding')
      .eq('game_id', params.gameId)
      .eq('is_active', true)
      .limit(50);

    if (existing && existing.length > 0) {
      for (const ref of existing) {
        if (ref.embedding && Array.isArray(ref.embedding)) {
          const similarity = cosineSimilarity(params.embedding, ref.embedding);
          if (similarity > 0.95) {
            return { added: false, reason: 'Duplicate detected (>95% similarity)' };
          }
        }
      }
    }

    // Insert new reference
    const { data, error } = await supabase
      .from('reference_answers')
      .insert({
        game_id: params.gameId,
        game_title: params.gameTitle,
        submission: params.submission,
        score: params.score,
        embedding: params.embedding,
        source_type: params.sourceType || 'player',
        source_player_id: params.sourcePlayerId,
        source_player_name: params.sourcePlayerName,
        skill_category: params.skillCategory,
        difficulty: params.difficulty,
        ai_score: params.aiScore,
        validation_score: params.validationScore,
        embedding_similarity: params.embeddingSimilarity,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Fallback insert failed:', error);
      return { added: false, reason: error.message };
    }

    return { added: true, id: data.id };
  } catch (err) {
    console.error('Fallback add reference failed:', err);
    return { added: false, reason: 'Database error' };
  }
};

// ============================================================================
// SCORING INTEGRATION
// ============================================================================

/**
 * Calculate multi-reference score for a submission
 *
 * Compares the submission's embedding against multiple high-scoring references
 * to get a more robust similarity score.
 */
export const calculateMultiReferenceScore = async (
  supabase: SupabaseClient,
  gameId: string,
  submissionEmbedding: number[],
  options: {
    minScore?: number;
    limit?: number;
  } = {}
): Promise<MultiReferenceScoreResult> => {
  const references = await findSimilarReferences(supabase, gameId, submissionEmbedding, options);

  if (references.length === 0) {
    return {
      averageSimilarity: 0,
      bestMatchSimilarity: 0,
      bestMatchScore: 0,
      matchCount: 0,
      weightedScore: 0,
      percentileEstimate: 50, // Neutral when no references
      references: [],
    };
  }

  // Calculate statistics
  const similarities = references.map(r => r.similarity);
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  const bestMatch = references[0]; // Already sorted by similarity
  const goodMatches = references.filter(r => r.similarity >= REFERENCE_CONFIG.minSimilarityThreshold);

  // Weighted score: similarity * reference score (rewards being similar to high scorers)
  const weightedScores = references.map(r => r.similarity * r.score);
  const weightedScore = weightedScores.reduce((a, b) => a + b, 0) / references.length;

  // Estimate percentile based on how similar we are to high scorers
  // If very similar to high scorers, percentile is high
  const percentileEstimate = Math.min(99, Math.max(1, Math.round(
    (avgSimilarity * 50) + // Base from average similarity
    (bestMatch.similarity * 30) + // Bonus from best match
    (goodMatches.length / references.length * 20) // Bonus from match count
  )));

  return {
    averageSimilarity: avgSimilarity,
    bestMatchSimilarity: bestMatch.similarity,
    bestMatchScore: bestMatch.score,
    matchCount: goodMatches.length,
    weightedScore,
    percentileEstimate,
    references,
  };
};

/**
 * Calculate the weight to use for multi-reference scoring in ensemble
 *
 * Returns higher weight when we have more verified references
 */
export const calculateMultiReferenceWeight = (stats: ReferenceStats | null): number => {
  if (!stats || stats.totalReferences === 0) {
    return 0; // No references, don't use multi-reference scoring
  }

  let weight = REFERENCE_CONFIG.baseWeight;

  // Add bonus for verified references
  const verifiedBonus = Math.min(
    REFERENCE_CONFIG.maxBonusWeight,
    stats.verifiedCount * REFERENCE_CONFIG.bonusWeightPerVerified
  );
  weight += verifiedBonus;

  // Add small bonus for having many references (more diverse comparison)
  if (stats.totalReferences >= 10) {
    weight += 0.02;
  } else if (stats.totalReferences >= 5) {
    weight += 0.01;
  }

  return Math.min(0.20, weight); // Cap at 20% of total score
};

/**
 * Format multi-reference score feedback for display
 */
export const formatMultiReferenceFeedback = (
  result: MultiReferenceScoreResult,
  stats: ReferenceStats | null
): string => {
  if (result.references.length === 0) {
    return ''; // No feedback when no references
  }

  const avgPercent = (result.averageSimilarity * 100).toFixed(1);
  const bestPercent = (result.bestMatchSimilarity * 100).toFixed(1);

  let qualityMessage = '';
  if (result.averageSimilarity >= 0.85) {
    qualityMessage = 'Your approach aligns very well with proven high-scoring solutions.';
  } else if (result.averageSimilarity >= 0.75) {
    qualityMessage = 'Your approach is solidly aligned with successful submissions.';
  } else if (result.averageSimilarity >= 0.65) {
    qualityMessage = 'Your approach shows some alignment with top answers, with room to improve.';
  } else {
    qualityMessage = 'Your approach differs from most high-scoring submissions. Review the patterns that work well.';
  }

  return `
<div style="background:#1e293b;padding:10px;border-radius:8px;border:1px solid #8b5cf6;margin-bottom:10px;">
  <p><strong>📚 Multi-Reference Analysis</strong></p>
  <p>Compared against ${result.references.length} high-scoring submissions${stats?.verifiedCount ? ` (${stats.verifiedCount} verified)` : ''}.</p>
  <p>Average similarity: <strong>${avgPercent}%</strong> | Best match: <strong>${bestPercent}%</strong> (score: ${result.bestMatchScore})</p>
  <p style="margin-top:6px;color:#a78bfa;">${qualityMessage}</p>
</div>`;
};

export default {
  findSimilarReferences,
  getReferenceStats,
  addReferenceAnswer,
  calculateMultiReferenceScore,
  calculateMultiReferenceWeight,
  formatMultiReferenceFeedback,
  cosineSimilarity,
  REFERENCE_CONFIG,
};
