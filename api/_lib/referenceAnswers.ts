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

  // ========================================================================
  // CROSS-GAME SHARING - Use references from same skill category as fallback
  // ========================================================================
  crossGame: {
    enabled: true,
    // Minimum references needed before using cross-game fallback
    minGameReferencesBeforeFallback: 3,
    // How many cross-game references to fetch
    maxCrossGameReferences: 15,
    // Similarity penalty for cross-game references (different game context)
    crossGameSimilarityPenalty: 0.10,
    // Weight reduction for cross-game scoring
    crossGameWeightMultiplier: 0.7,
    // Minimum similarity after penalty to count as valid
    minCrossGameSimilarity: 0.60,
    // Prefer same difficulty level
    preferSameDifficulty: true,
    // Bonus for same difficulty
    sameDifficultyBonus: 0.05,
  },
};

// Extended types for cross-game references
export interface CrossGameReference extends SimilarReference {
  originalGameId: string;
  originalGameTitle: string;
  skillCategory: string;
  difficulty?: string;
  isCrossGame: boolean;
  adjustedSimilarity: number;
}

export interface CrossGameReferenceResult {
  references: CrossGameReference[];
  sourceGames: string[];
  totalFromCurrentGame: number;
  totalFromCrossGame: number;
  usedCrossGameFallback: boolean;
}

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

// ============================================================================
// CROSS-GAME REFERENCE SHARING
// When a game has few/no references, use references from same skill category
// ============================================================================

/**
 * Find references from other games in the same skill category
 * Used as fallback when current game has insufficient references
 */
export const findCrossGameReferences = async (
  supabase: SupabaseClient,
  currentGameId: string,
  skillCategory: string,
  queryEmbedding: number[],
  currentDifficulty?: string,
  options: {
    limit?: number;
    minScore?: number;
    excludeGameIds?: string[];
  } = {}
): Promise<CrossGameReference[]> => {
  const {
    limit = REFERENCE_CONFIG.crossGame.maxCrossGameReferences,
    minScore = REFERENCE_CONFIG.minScoreThreshold,
    excludeGameIds = [],
  } = options;

  const config = REFERENCE_CONFIG.crossGame;

  try {
    // Query references from same skill category but different games
    const { data, error } = await supabase
      .from('reference_answers')
      .select('id, game_id, game_title, submission, score, embedding, source_type, is_verified, skill_category, difficulty')
      .eq('skill_category', skillCategory)
      .eq('is_active', true)
      .neq('game_id', currentGameId)
      .gte('score', minScore)
      .limit(limit * 2); // Fetch extra for filtering

    if (error) {
      console.error('Cross-game reference query failed:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter out excluded games
    const filtered = data.filter((row: any) => !excludeGameIds.includes(row.game_id));

    // Calculate similarities in memory with cross-game adjustments
    const withSimilarity: CrossGameReference[] = filtered
      .filter((row: any) => row.embedding && Array.isArray(row.embedding))
      .map((row: any) => {
        const rawSimilarity = cosineSimilarity(queryEmbedding, row.embedding);

        // Apply cross-game penalty
        let adjustedSimilarity = rawSimilarity - config.crossGameSimilarityPenalty;

        // Bonus for same difficulty level
        if (config.preferSameDifficulty && currentDifficulty && row.difficulty === currentDifficulty) {
          adjustedSimilarity += config.sameDifficultyBonus;
        }

        // Clamp to valid range
        adjustedSimilarity = Math.max(0, Math.min(1, adjustedSimilarity));

        return {
          id: row.id,
          gameId: currentGameId, // Report as current game for compatibility
          originalGameId: row.game_id,
          originalGameTitle: row.game_title || row.game_id,
          submission: row.submission,
          score: row.score,
          similarity: rawSimilarity,
          adjustedSimilarity,
          sourceType: row.source_type,
          isVerified: row.is_verified,
          skillCategory: row.skill_category,
          difficulty: row.difficulty,
          isCrossGame: true,
        };
      })
      // Filter by minimum adjusted similarity
      .filter(ref => ref.adjustedSimilarity >= config.minCrossGameSimilarity)
      // Sort by adjusted similarity
      .sort((a, b) => b.adjustedSimilarity - a.adjustedSimilarity)
      .slice(0, limit);

    return withSimilarity;
  } catch (err) {
    console.error('Error finding cross-game references:', err);
    return [];
  }
};

/**
 * Get combined references: current game + cross-game fallback if needed
 * This is the main entry point for cross-game reference sharing
 */
export const findReferencesWithCrossGameFallback = async (
  supabase: SupabaseClient,
  gameId: string,
  skillCategory: string,
  queryEmbedding: number[],
  difficulty?: string,
  options: {
    limit?: number;
    minScore?: number;
  } = {}
): Promise<CrossGameReferenceResult> => {
  const {
    limit = REFERENCE_CONFIG.maxReferencesToCompare,
    minScore = REFERENCE_CONFIG.minScoreThreshold,
  } = options;

  const config = REFERENCE_CONFIG.crossGame;

  // First, try to get references from current game
  const gameReferences = await findSimilarReferences(supabase, gameId, queryEmbedding, {
    limit,
    minScore,
  });

  // Convert to CrossGameReference format
  const gameRefs: CrossGameReference[] = gameReferences.map(ref => ({
    ...ref,
    originalGameId: ref.gameId,
    originalGameTitle: '',
    skillCategory,
    difficulty,
    isCrossGame: false,
    adjustedSimilarity: ref.similarity,
  }));

  // Check if we need cross-game fallback
  const needsCrossGame = config.enabled &&
    gameRefs.length < config.minGameReferencesBeforeFallback;

  let crossGameRefs: CrossGameReference[] = [];
  if (needsCrossGame) {
    console.log(`[CrossGame] Game ${gameId} has ${gameRefs.length} references, fetching cross-game fallback`);

    crossGameRefs = await findCrossGameReferences(
      supabase,
      gameId,
      skillCategory,
      queryEmbedding,
      difficulty,
      {
        limit: limit - gameRefs.length,
        minScore,
        excludeGameIds: [gameId],
      }
    );

    console.log(`[CrossGame] Found ${crossGameRefs.length} cross-game references from skill category "${skillCategory}"`);
  }

  // Combine and sort by adjusted similarity
  const allRefs = [...gameRefs, ...crossGameRefs]
    .sort((a, b) => b.adjustedSimilarity - a.adjustedSimilarity)
    .slice(0, limit);

  // Get unique source games
  const sourceGames = [...new Set(crossGameRefs.map(r => r.originalGameId))];

  return {
    references: allRefs,
    sourceGames,
    totalFromCurrentGame: gameRefs.length,
    totalFromCrossGame: crossGameRefs.length,
    usedCrossGameFallback: crossGameRefs.length > 0,
  };
};

/**
 * Calculate multi-reference score with cross-game support
 * Enhanced version that uses cross-game references when needed
 */
export const calculateMultiReferenceScoreWithCrossGame = async (
  supabase: SupabaseClient,
  gameId: string,
  skillCategory: string,
  submissionEmbedding: number[],
  difficulty?: string,
  options: {
    minScore?: number;
    limit?: number;
  } = {}
): Promise<MultiReferenceScoreResult & { crossGameInfo: CrossGameReferenceResult }> => {
  const crossGameResult = await findReferencesWithCrossGameFallback(
    supabase,
    gameId,
    skillCategory,
    submissionEmbedding,
    difficulty,
    options
  );

  const references = crossGameResult.references;

  if (references.length === 0) {
    return {
      averageSimilarity: 0,
      bestMatchSimilarity: 0,
      bestMatchScore: 0,
      matchCount: 0,
      weightedScore: 0,
      percentileEstimate: 50,
      references: references.map(r => ({
        id: r.id,
        gameId: r.gameId,
        submission: r.submission,
        score: r.score,
        similarity: r.adjustedSimilarity, // Use adjusted for cross-game
        sourceType: r.sourceType,
        isVerified: r.isVerified,
      })),
      crossGameInfo: crossGameResult,
    };
  }

  // Use adjusted similarities for scoring
  const similarities = references.map(r => r.adjustedSimilarity);
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  const bestMatch = references[0];
  const goodMatches = references.filter(r =>
    r.adjustedSimilarity >= REFERENCE_CONFIG.minSimilarityThreshold
  );

  // Weighted score with cross-game weight reduction
  let weightedScores = references.map(r => {
    let weight = r.adjustedSimilarity;
    // Apply additional weight reduction for cross-game references
    if (r.isCrossGame) {
      weight *= REFERENCE_CONFIG.crossGame.crossGameWeightMultiplier;
    }
    return weight * r.score;
  });
  const totalWeight = references.reduce((sum, r) => {
    let w = r.adjustedSimilarity;
    if (r.isCrossGame) w *= REFERENCE_CONFIG.crossGame.crossGameWeightMultiplier;
    return sum + w;
  }, 0);

  const weightedScore = totalWeight > 0
    ? weightedScores.reduce((a, b) => a + b, 0) / totalWeight
    : 0;

  // Estimate percentile
  const percentileEstimate = Math.min(99, Math.max(1, Math.round(
    (avgSimilarity * 50) +
    (bestMatch.adjustedSimilarity * 30) +
    (goodMatches.length / references.length * 20)
  )));

  return {
    averageSimilarity: avgSimilarity,
    bestMatchSimilarity: bestMatch.adjustedSimilarity,
    bestMatchScore: bestMatch.score,
    matchCount: goodMatches.length,
    weightedScore,
    percentileEstimate,
    references: references.map(r => ({
      id: r.id,
      gameId: r.gameId,
      submission: r.submission,
      score: r.score,
      similarity: r.adjustedSimilarity,
      sourceType: r.sourceType,
      isVerified: r.isVerified,
    })),
    crossGameInfo: crossGameResult,
  };
};

/**
 * Format cross-game reference feedback for display
 */
export const formatCrossGameFeedback = (
  crossGameInfo: CrossGameReferenceResult,
  avgSimilarity: number
): string => {
  if (!crossGameInfo.usedCrossGameFallback) {
    return '';
  }

  const sourceCount = crossGameInfo.sourceGames.length;
  const crossCount = crossGameInfo.totalFromCrossGame;

  return `
<div style="background:#1e293b;padding:10px;border-radius:8px;border:1px solid #6366f1;margin-bottom:10px;">
  <p><strong>Cross-Game Analysis</strong></p>
  <p style="font-size:0.9em;color:#a5b4fc;">
    This game has limited reference data, so we compared your submission against
    <strong>${crossCount}</strong> high-scoring submissions from
    <strong>${sourceCount}</strong> related game${sourceCount !== 1 ? 's' : ''}
    in the same skill category.
  </p>
  <p style="font-size:0.85em;color:#94a3b8;margin-top:6px;">
    Average similarity: ${(avgSimilarity * 100).toFixed(1)}%
    (Note: Cross-game comparisons are weighted lower than same-game comparisons)
  </p>
</div>`;
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

// ============================================================================
// REFERENCE SEEDING - NEW: Utilities for seeding games with curated examples
// ============================================================================

export interface SeedReferenceInput {
  gameId: string;
  gameTitle: string;
  submission: string;
  score: number;
  skillCategory?: string;
  difficulty?: string;
  notes?: string; // Admin notes about why this is a good example
}

export interface SeedResult {
  gameId: string;
  success: boolean;
  referenceId?: string;
  error?: string;
}

/**
 * Seed a single game with a curated reference answer
 * Requires embedding generation (pass the embedding function)
 */
export const seedReferenceAnswer = async (
  supabase: SupabaseClient,
  input: SeedReferenceInput,
  embedding: number[],
  verifyImmediately: boolean = true
): Promise<SeedResult> => {
  try {
    // Use the existing add function with curated source type
    const result = await addReferenceAnswer(supabase, {
      gameId: input.gameId,
      gameTitle: input.gameTitle,
      submission: input.submission,
      score: input.score,
      embedding,
      sourceType: 'curated',
      skillCategory: input.skillCategory,
      difficulty: input.difficulty,
    });

    if (!result.added || !result.id) {
      return {
        gameId: input.gameId,
        success: false,
        error: result.reason || 'Failed to add reference',
      };
    }

    // If verify immediately, mark as verified
    if (verifyImmediately) {
      await supabase
        .from('reference_answers')
        .update({
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.id);
    }

    return {
      gameId: input.gameId,
      success: true,
      referenceId: result.id,
    };
  } catch (err) {
    console.error(`Error seeding reference for ${input.gameId}:`, err);
    return {
      gameId: input.gameId,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Batch seed multiple games with curated references
 * Returns summary of successes and failures
 */
export const seedMultipleReferences = async (
  supabase: SupabaseClient,
  inputs: Array<SeedReferenceInput & { embedding: number[] }>,
  verifyImmediately: boolean = true
): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: SeedResult[];
}> => {
  const results: SeedResult[] = [];

  for (const input of inputs) {
    const result = await seedReferenceAnswer(
      supabase,
      input,
      input.embedding,
      verifyImmediately
    );
    results.push(result);
  }

  return {
    total: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
};

/**
 * Get games that have no reference answers (need seeding)
 */
export const getGamesNeedingSeeding = async (
  supabase: SupabaseClient,
  allGameIds: string[]
): Promise<string[]> => {
  try {
    // Get games that already have references
    const { data, error } = await supabase
      .from('reference_answers')
      .select('game_id')
      .eq('is_active', true);

    if (error) {
      console.error('Error checking existing references:', error);
      return allGameIds; // Assume all need seeding if we can't check
    }

    const gamesWithRefs = new Set((data || []).map((r: any) => r.game_id));

    // Return games without any references
    return allGameIds.filter(id => !gamesWithRefs.has(id));
  } catch (err) {
    console.error('Error getting games needing seeding:', err);
    return allGameIds;
  }
};

/**
 * Lower the score threshold temporarily for new games
 * Useful when bootstrapping the reference database
 */
export const getBootstrapConfig = (isNewGame: boolean): typeof REFERENCE_CONFIG => {
  if (!isNewGame) {
    return REFERENCE_CONFIG;
  }

  // For new games, temporarily accept lower scores
  return {
    ...REFERENCE_CONFIG,
    minScoreThreshold: 70, // Lowered from 80
    minSimilarityThreshold: 0.65, // Lowered from 0.70
  };
};

/**
 * Promote a player submission to a verified reference
 * Useful when admins identify high-quality submissions
 */
export const promoteToVerifiedReference = async (
  supabase: SupabaseClient,
  referenceId: string,
  promotedBy?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reference_answers')
      .update({
        is_verified: true,
        source_type: 'curated', // Upgrade from player to curated
        updated_at: new Date().toISOString(),
      })
      .eq('id', referenceId);

    if (error) {
      console.error('Error promoting reference:', error);
      return false;
    }

    console.log(`Reference ${referenceId} promoted to verified${promotedBy ? ` by ${promotedBy}` : ''}`);
    return true;
  } catch (err) {
    console.error('Error promoting reference:', err);
    return false;
  }
};

/**
 * Get seeding status summary for all games
 */
export const getSeedingStatus = async (
  supabase: SupabaseClient,
  allGameIds: string[]
): Promise<{
  seeded: number;
  needsSeeding: number;
  gamesByStatus: {
    wellSeeded: string[]; // 5+ references
    partiallySeeded: string[]; // 1-4 references
    notSeeded: string[]; // 0 references
  };
}> => {
  try {
    const { data, error } = await supabase
      .from('reference_answers')
      .select('game_id')
      .eq('is_active', true);

    if (error) {
      console.error('Error getting seeding status:', error);
      return {
        seeded: 0,
        needsSeeding: allGameIds.length,
        gamesByStatus: {
          wellSeeded: [],
          partiallySeeded: [],
          notSeeded: allGameIds,
        },
      };
    }

    // Count references per game
    const refCounts = new Map<string, number>();
    for (const row of data || []) {
      const gameId = row.game_id as string;
      refCounts.set(gameId, (refCounts.get(gameId) || 0) + 1);
    }

    const wellSeeded: string[] = [];
    const partiallySeeded: string[] = [];
    const notSeeded: string[] = [];

    for (const gameId of allGameIds) {
      const count = refCounts.get(gameId) || 0;
      if (count >= 5) {
        wellSeeded.push(gameId);
      } else if (count > 0) {
        partiallySeeded.push(gameId);
      } else {
        notSeeded.push(gameId);
      }
    }

    return {
      seeded: wellSeeded.length + partiallySeeded.length,
      needsSeeding: notSeeded.length,
      gamesByStatus: {
        wellSeeded,
        partiallySeeded,
        notSeeded,
      },
    };
  } catch (err) {
    console.error('Error getting seeding status:', err);
    return {
      seeded: 0,
      needsSeeding: allGameIds.length,
      gamesByStatus: {
        wellSeeded: [],
        partiallySeeded: [],
        notSeeded: allGameIds,
      },
    };
  }
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
  // Seeding utilities
  seedReferenceAnswer,
  seedMultipleReferences,
  getGamesNeedingSeeding,
  getBootstrapConfig,
  promoteToVerifiedReference,
  getSeedingStatus,
  // NEW: Cross-game reference sharing
  findCrossGameReferences,
  findReferencesWithCrossGameFallback,
  calculateMultiReferenceScoreWithCrossGame,
  formatCrossGameFeedback,
};
