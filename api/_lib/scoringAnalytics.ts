/**
 * Scoring Analytics Service
 *
 * Provides AI scoring observability by tracking:
 * - Score distributions per game
 * - AI vs validation disagreements
 * - Confidence levels over time
 * - Player scoring history
 *
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface ScoringAnalyticsInput {
  attemptId: string;
  playerId: string;
  playerName?: string;
  gameId: string;
  gameTitle: string;
  gameType: 'individual' | 'team';
  teamId?: string;
  teamName?: string;
  finalScore: number;
  aiScore?: number;
  validationScore?: number;
  embeddingSimilarity?: number;
  multiReferenceScore?: number;
  aiWeight?: number;
  validationWeight?: number;
  embeddingWeight?: number;
  multiReferenceWeight?: number;
  aiConfidence?: number;
  integritySignals?: Record<string, unknown>;
  gamingRiskLevel?: 'none' | 'low' | 'medium' | 'high';
  submissionLength?: number;
  submissionWordCount?: number;
  processingTimeMs?: number;
  referencesCompared?: number;
  verifiedReferencesCount?: number;
  bestReferenceSimilarity?: number;
  scoringVersion?: string;
}

export interface GameScoringStats {
  gameId: string;
  gameTitle: string;
  gameType: string;
  totalAttempts: number;
  uniquePlayers: number;
  avgFinalScore: number;
  medianFinalScore: number;
  minFinalScore: number;
  maxFinalScore: number;
  scoreStdDev: number;
  avgAiScore: number;
  avgValidationScore: number;
  avgEmbeddingSimilarity: number;
  avgMultiReferenceScore: number;
  avgAiValidationDiff: number;
  significantDisagreementRate: number;
  disagreementCount: number;
  avgAiConfidence: number;
  lowConfidenceRate: number;
  gamingDetectionRate: number;
  integrityFailureRate: number;
  needsRubricReview: boolean;
  rubricReviewReason: string | null;
  scoreBuckets: {
    '0-20': number;
    '21-40': number;
    '41-60': number;
    '61-80': number;
    '81-100': number;
  };
  firstAttemptAt: string;
  lastAttemptAt: string;
  statsUpdatedAt: string;
}

export interface PlayerHistory {
  playerId: string;
  playerName: string;
  totalGamesPlayed: number;
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  scoreTrend: 'improving' | 'stable' | 'declining' | 'new';
  recentAvgScore: number;
  recentGames: Array<{
    gameId: string;
    gameTitle: string;
    score: number;
    timestamp: string;
  }>;
  gamesAbove80: number;
  gamesBelow50: number;
  improvementRate: number;
  areasForImprovement: string[] | null;
  firstGameAt: string;
  lastGameAt: string;
}

export interface DisagreementRecord {
  id: string;
  analyticsId: string;
  gameId: string;
  gameTitle: string;
  playerId: string;
  aiScore: number;
  validationScore: number;
  scoreDifference: number;
  finalScore: number;
  resolutionMethod: string;
  submissionExcerpt?: string;
  aiFeedback?: string;
  validationFeedback?: string;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rubricUpdateNeeded?: boolean;
  createdAt: string;
}

// ============================================================================
// Analytics Logging
// ============================================================================

/**
 * Log scoring analytics for an attempt
 * This is the main function to call after scoring is complete
 */
export async function logScoringAnalytics(
  supabase: SupabaseClient,
  input: ScoringAnalyticsInput
): Promise<{ analyticsId: string | null; error: string | null }> {
  try {
    const startTime = Date.now();

    // Call the database function to log analytics
    const { data, error } = await supabase.rpc('log_scoring_analytics', {
      p_attempt_id: input.attemptId,
      p_player_id: input.playerId,
      p_player_name: input.playerName || null,
      p_game_id: input.gameId,
      p_game_title: input.gameTitle,
      p_game_type: input.gameType,
      p_team_id: input.teamId || null,
      p_team_name: input.teamName || null,
      p_final_score: input.finalScore,
      p_ai_score: input.aiScore ?? null,
      p_validation_score: input.validationScore ?? null,
      p_embedding_similarity: input.embeddingSimilarity ?? null,
      p_multi_reference_score: input.multiReferenceScore ?? null,
      p_ai_weight: input.aiWeight ?? null,
      p_validation_weight: input.validationWeight ?? null,
      p_embedding_weight: input.embeddingWeight ?? null,
      p_multi_reference_weight: input.multiReferenceWeight ?? null,
      p_ai_confidence: input.aiConfidence ?? null,
      p_integrity_signals: input.integritySignals ? JSON.stringify(input.integritySignals) : null,
      p_gaming_risk_level: input.gamingRiskLevel || 'none',
      p_submission_length: input.submissionLength ?? null,
      p_submission_word_count: input.submissionWordCount ?? null,
      p_processing_time_ms: input.processingTimeMs ?? null,
      p_references_compared: input.referencesCompared ?? 0,
      p_verified_references_count: input.verifiedReferencesCount ?? 0,
      p_best_reference_similarity: input.bestReferenceSimilarity ?? null,
      p_scoring_version: input.scoringVersion || null,
    });

    if (error) {
      console.error('[ScoringAnalytics] Error logging analytics:', error);
      return { analyticsId: null, error: error.message };
    }

    const analyticsId = data as string;
    const duration = Date.now() - startTime;

    console.log(`[ScoringAnalytics] Logged analytics for attempt ${input.attemptId} in ${duration}ms`);

    // Update game stats asynchronously (don't wait for it)
    updateGameStatsAsync(supabase, input.gameId);

    // Update player history asynchronously (don't wait for it)
    updatePlayerHistoryAsync(supabase, input.playerId, input.playerName);

    return { analyticsId, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ScoringAnalytics] Exception logging analytics:', errorMessage);
    return { analyticsId: null, error: errorMessage };
  }
}

/**
 * Update game scoring stats asynchronously
 */
async function updateGameStatsAsync(supabase: SupabaseClient, gameId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_game_scoring_stats', {
      p_game_id: gameId,
    });

    if (error) {
      console.error(`[ScoringAnalytics] Error updating game stats for ${gameId}:`, error);
    }
  } catch (err) {
    console.error(`[ScoringAnalytics] Exception updating game stats:`, err);
  }
}

/**
 * Update player history asynchronously
 */
async function updatePlayerHistoryAsync(
  supabase: SupabaseClient,
  playerId: string,
  playerName?: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_player_scoring_history', {
      p_player_id: playerId,
      p_player_name: playerName || null,
    });

    if (error) {
      console.error(`[ScoringAnalytics] Error updating player history for ${playerId}:`, error);
    }
  } catch (err) {
    console.error(`[ScoringAnalytics] Exception updating player history:`, err);
  }
}

// ============================================================================
// Analytics Queries
// ============================================================================

/**
 * Get game scoring statistics
 */
export async function getGameScoringStats(
  supabase: SupabaseClient,
  gameId: string
): Promise<GameScoringStats | null> {
  try {
    const { data, error } = await supabase
      .from('game_scoring_stats')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      console.error('[ScoringAnalytics] Error fetching game stats:', error);
      return null;
    }

    return {
      gameId: data.game_id,
      gameTitle: data.game_title,
      gameType: data.game_type,
      totalAttempts: data.total_attempts,
      uniquePlayers: data.unique_players,
      avgFinalScore: data.avg_final_score,
      medianFinalScore: data.median_final_score,
      minFinalScore: data.min_final_score,
      maxFinalScore: data.max_final_score,
      scoreStdDev: data.score_std_dev,
      avgAiScore: data.avg_ai_score,
      avgValidationScore: data.avg_validation_score,
      avgEmbeddingSimilarity: data.avg_embedding_similarity,
      avgMultiReferenceScore: data.avg_multi_reference_score,
      avgAiValidationDiff: data.avg_ai_validation_diff,
      significantDisagreementRate: data.significant_disagreement_rate,
      disagreementCount: data.disagreement_count,
      avgAiConfidence: data.avg_ai_confidence,
      lowConfidenceRate: data.low_confidence_rate,
      gamingDetectionRate: data.gaming_detection_rate,
      integrityFailureRate: data.integrity_failure_rate,
      needsRubricReview: data.needs_rubric_review,
      rubricReviewReason: data.rubric_review_reason,
      scoreBuckets: {
        '0-20': data.score_bucket_0_20,
        '21-40': data.score_bucket_21_40,
        '41-60': data.score_bucket_41_60,
        '61-80': data.score_bucket_61_80,
        '81-100': data.score_bucket_81_100,
      },
      firstAttemptAt: data.first_attempt_at,
      lastAttemptAt: data.last_attempt_at,
      statsUpdatedAt: data.stats_updated_at,
    };
  } catch (err) {
    console.error('[ScoringAnalytics] Exception fetching game stats:', err);
    return null;
  }
}

/**
 * Get all games that need rubric review
 */
export async function getGamesNeedingReview(
  supabase: SupabaseClient
): Promise<GameScoringStats[]> {
  try {
    const { data, error } = await supabase.rpc('get_games_needing_review');

    if (error) {
      console.error('[ScoringAnalytics] Error fetching games needing review:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      gameId: row.game_id as string,
      gameTitle: row.game_title as string,
      gameType: row.game_type as string,
      totalAttempts: row.total_attempts as number,
      avgFinalScore: row.avg_final_score as number,
      significantDisagreementRate: row.significant_disagreement_rate as number,
      lowConfidenceRate: row.low_confidence_rate as number,
      avgAiValidationDiff: row.avg_ai_validation_diff as number,
      rubricReviewReason: row.rubric_review_reason as string,
      statsUpdatedAt: row.stats_updated_at as string,
    })) as GameScoringStats[];
  } catch (err) {
    console.error('[ScoringAnalytics] Exception fetching games needing review:', err);
    return [];
  }
}

/**
 * Get player scoring history
 */
export async function getPlayerHistory(
  supabase: SupabaseClient,
  playerId: string
): Promise<PlayerHistory | null> {
  try {
    const { data, error } = await supabase.rpc('get_player_history', {
      p_player_id: playerId,
    });

    if (error) {
      console.error('[ScoringAnalytics] Error fetching player history:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      playerId: row.player_id,
      playerName: row.player_name,
      totalGamesPlayed: row.total_games_played,
      totalAttempts: row.total_attempts,
      avgScore: row.avg_score,
      bestScore: row.best_score,
      worstScore: row.worst_score,
      scoreTrend: row.score_trend,
      recentAvgScore: row.recent_avg_score,
      recentGames: row.recent_games || [],
      gamesAbove80: row.games_above_80,
      gamesBelow50: row.games_below_50,
      improvementRate: row.improvement_rate,
      areasForImprovement: row.areas_for_improvement,
      firstGameAt: row.first_game_at,
      lastGameAt: row.last_game_at,
    };
  } catch (err) {
    console.error('[ScoringAnalytics] Exception fetching player history:', err);
    return null;
  }
}

/**
 * Get unreviewed disagreements for a game
 */
export async function getUnreviewedDisagreements(
  supabase: SupabaseClient,
  gameId?: string,
  limit: number = 50
): Promise<DisagreementRecord[]> {
  try {
    let query = supabase
      .from('scoring_disagreements')
      .select('*')
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ScoringAnalytics] Error fetching disagreements:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      analyticsId: row.analytics_id as string,
      gameId: row.game_id as string,
      gameTitle: row.game_title as string,
      playerId: row.player_id as string,
      aiScore: row.ai_score as number,
      validationScore: row.validation_score as number,
      scoreDifference: row.score_difference as number,
      finalScore: row.final_score as number,
      resolutionMethod: row.resolution_method as string,
      submissionExcerpt: row.submission_excerpt as string | undefined,
      aiFeedback: row.ai_feedback as string | undefined,
      validationFeedback: row.validation_feedback as string | undefined,
      reviewed: row.reviewed as boolean,
      reviewedBy: row.reviewed_by as string | undefined,
      reviewedAt: row.reviewed_at as string | undefined,
      reviewNotes: row.review_notes as string | undefined,
      rubricUpdateNeeded: row.rubric_update_needed as boolean | undefined,
      createdAt: row.created_at as string,
    }));
  } catch (err) {
    console.error('[ScoringAnalytics] Exception fetching disagreements:', err);
    return [];
  }
}

/**
 * Mark a disagreement as reviewed
 */
export async function markDisagreementReviewed(
  supabase: SupabaseClient,
  disagreementId: string,
  reviewedBy: string,
  reviewNotes?: string,
  rubricUpdateNeeded?: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scoring_disagreements')
      .update({
        reviewed: true,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
        rubric_update_needed: rubricUpdateNeeded || false,
      })
      .eq('id', disagreementId);

    if (error) {
      console.error('[ScoringAnalytics] Error marking disagreement reviewed:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ScoringAnalytics] Exception marking disagreement reviewed:', err);
    return false;
  }
}

// ============================================================================
// Analytics Summary
// ============================================================================

/**
 * Get overall scoring analytics summary
 */
export async function getAnalyticsSummary(
  supabase: SupabaseClient
): Promise<{
  totalAttempts: number;
  totalGames: number;
  totalPlayers: number;
  avgScore: number;
  gamesNeedingReview: number;
  unreviewedDisagreements: number;
  scoringHealth: 'good' | 'warning' | 'critical';
}> {
  try {
    // Get counts from various tables
    const [analyticsCount, gamesCount, playersCount, reviewCount, disagreementCount] = await Promise.all([
      supabase.from('scoring_analytics').select('id', { count: 'exact', head: true }),
      supabase.from('game_scoring_stats').select('game_id', { count: 'exact', head: true }),
      supabase.from('player_scoring_history').select('player_id', { count: 'exact', head: true }),
      supabase.from('game_scoring_stats').select('game_id', { count: 'exact', head: true }).eq('needs_rubric_review', true),
      supabase.from('scoring_disagreements').select('id', { count: 'exact', head: true }).eq('reviewed', false),
    ]);

    // Get average score
    const { data: avgData } = await supabase
      .from('scoring_analytics')
      .select('final_score')
      .limit(1000);

    const avgScore = avgData && avgData.length > 0
      ? avgData.reduce((sum, row) => sum + (row.final_score as number), 0) / avgData.length
      : 0;

    const gamesNeedingReview = reviewCount.count || 0;
    const unreviewedDisagreements = disagreementCount.count || 0;

    // Determine health status
    let scoringHealth: 'good' | 'warning' | 'critical' = 'good';
    if (gamesNeedingReview > 5 || unreviewedDisagreements > 50) {
      scoringHealth = 'critical';
    } else if (gamesNeedingReview > 2 || unreviewedDisagreements > 20) {
      scoringHealth = 'warning';
    }

    return {
      totalAttempts: analyticsCount.count || 0,
      totalGames: gamesCount.count || 0,
      totalPlayers: playersCount.count || 0,
      avgScore: Math.round(avgScore * 10) / 10,
      gamesNeedingReview,
      unreviewedDisagreements,
      scoringHealth,
    };
  } catch (err) {
    console.error('[ScoringAnalytics] Exception fetching analytics summary:', err);
    return {
      totalAttempts: 0,
      totalGames: 0,
      totalPlayers: 0,
      avgScore: 0,
      gamesNeedingReview: 0,
      unreviewedDisagreements: 0,
      scoringHealth: 'good',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate gaming risk level based on integrity signals
 */
export function calculateGamingRiskLevel(
  integritySignals?: Record<string, unknown>
): 'none' | 'low' | 'medium' | 'high' {
  if (!integritySignals) return 'none';

  let riskScore = 0;

  // Check various signals
  if (integritySignals.isExactCopy) riskScore += 100;
  if (integritySignals.isMostlyCopy) riskScore += 50;
  if (integritySignals.isTemplateWithMinorChanges) riskScore += 30;
  if (integritySignals.isTooShort) riskScore += 20;
  if (integritySignals.isTooFast) riskScore += 15;
  if (integritySignals.hasRepetitivePatterns) riskScore += 25;

  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  if (riskScore > 0) return 'low';
  return 'none';
}

/**
 * Count words in a submission
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}
