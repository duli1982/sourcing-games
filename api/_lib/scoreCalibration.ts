/**
 * Score Calibration & Normalization Service
 *
 * Analyzes scoring patterns across games to ensure consistent difficulty.
 * Identifies games that score too easy/hard and provides normalization.
 *
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Difficulty } from '../../types.js';

// ============================================================================
// Types
// ============================================================================

// Map project difficulty to calibration difficulty for benchmarks
type CalibrationDifficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyBenchmark {
  difficulty: Difficulty;
  expectedAvgScore: number;
  expectedMedianScore: number;
  expectedStdDev: number;
  expectedP25: number;
  expectedP75: number;
  acceptableAvgMin: number;
  acceptableAvgMax: number;
  intermediatePlayerExpected: number;
  deviationThresholdMinor: number;
  deviationThresholdSignificant: number;
  deviationThresholdExtreme: number;
}

export interface GameCalibration {
  gameId: string;
  gameTitle: string;
  skillCategory: string;
  statedDifficulty: Difficulty;
  rawAvgScore: number | null;
  rawMedianScore: number | null;
  rawStdDev: number | null;
  expectedAvgScore: number;
  calibrationOffset: number;
  calibrationScale: number;
  calibrationMethod: 'none' | 'offset' | 'scale' | 'percentile';
  deviationFromPeer: number | null;
  deviationSignificance: 'normal' | 'minor' | 'significant' | 'extreme';
  isCalibrated: boolean;
  calibrationConfidence: number;
  sampleCount: number;
  needsReview: boolean;
  reviewReason: string | null;
}

export interface CalibrationResult {
  rawScore: number;
  calibratedScore: number;
  adjustmentApplied: number;
  calibrationMethod: string;
  gameCalibration: GameCalibration | null;
}

export interface CalibrationReport {
  difficulty: Difficulty;
  gameCount: number;
  avgDeviation: number;
  gamesNeedingReview: number;
  gamesCalibrated: number;
  tooEasyCount: number;
  tooHardCount: number;
}

export interface CalibrationRunResult {
  runId: string;
  gamesAnalyzed: number;
  gamesCalibrated: number;
  gamesFlagged: number;
  gamesTooEasy: string[];
  gamesTooHard: string[];
  durationMs: number;
}

// ============================================================================
// Configuration
// ============================================================================

export const CALIBRATION_CONFIG = {
  // Minimum samples required for calibration
  minSamplesForCalibration: 30,

  // How much calibration to apply (0-1, where 1 is full adjustment)
  calibrationStrength: 0.8,

  // Maximum adjustment allowed
  maxCalibrationOffset: 15,

  // Auto-calibrate if deviation exceeds this
  autoCalibrationThreshold: 5,

  // Confidence threshold for applying calibration
  minConfidenceForCalibration: 0.5,
};

// Default benchmarks (fallback if DB not available)
// Using project difficulty levels: easy, medium, hard
export const DEFAULT_BENCHMARKS: Record<Difficulty, DifficultyBenchmark> = {
  easy: {
    difficulty: 'easy',
    expectedAvgScore: 75,
    expectedMedianScore: 78,
    expectedStdDev: 12,
    expectedP25: 68,
    expectedP75: 85,
    acceptableAvgMin: 65,
    acceptableAvgMax: 85,
    intermediatePlayerExpected: 80,
    deviationThresholdMinor: 5,
    deviationThresholdSignificant: 10,
    deviationThresholdExtreme: 15,
  },
  medium: {
    difficulty: 'medium',
    expectedAvgScore: 60,
    expectedMedianScore: 62,
    expectedStdDev: 15,
    expectedP25: 50,
    expectedP75: 72,
    acceptableAvgMin: 50,
    acceptableAvgMax: 70,
    intermediatePlayerExpected: 65,
    deviationThresholdMinor: 5,
    deviationThresholdSignificant: 10,
    deviationThresholdExtreme: 15,
  },
  hard: {
    difficulty: 'hard',
    expectedAvgScore: 45,
    expectedMedianScore: 48,
    expectedStdDev: 18,
    expectedP25: 35,
    expectedP75: 60,
    acceptableAvgMin: 35,
    acceptableAvgMax: 55,
    intermediatePlayerExpected: 50,
    deviationThresholdMinor: 5,
    deviationThresholdSignificant: 10,
    deviationThresholdExtreme: 15,
  },
};

// In-memory cache for calibration data
const calibrationCache = new Map<string, { data: GameCalibration; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Gets calibration data for a game
 */
export const getGameCalibration = async (
  supabase: SupabaseClient,
  gameId: string
): Promise<GameCalibration | null> => {
  // Check cache first
  const cached = calibrationCache.get(gameId);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('score_calibration')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (error || !data) {
      return null;
    }

    const calibration: GameCalibration = {
      gameId: data.game_id,
      gameTitle: data.game_title,
      skillCategory: data.skill_category,
      statedDifficulty: data.stated_difficulty as Difficulty,
      rawAvgScore: data.raw_avg_score,
      rawMedianScore: data.raw_median_score,
      rawStdDev: data.raw_std_dev,
      expectedAvgScore: data.expected_avg_score,
      calibrationOffset: data.calibration_offset || 0,
      calibrationScale: data.calibration_scale || 1.0,
      calibrationMethod: data.calibration_method || 'none',
      deviationFromPeer: data.deviation_from_peer,
      deviationSignificance: data.deviation_significance || 'normal',
      isCalibrated: data.is_calibrated || false,
      calibrationConfidence: data.calibration_confidence || 0,
      sampleCount: data.sample_count || 0,
      needsReview: data.needs_review || false,
      reviewReason: data.review_reason,
    };

    // Cache the result
    calibrationCache.set(gameId, {
      data: calibration,
      expiry: Date.now() + CACHE_TTL_MS,
    });

    return calibration;
  } catch (err) {
    console.warn('Failed to get game calibration:', err);
    return null;
  }
};

/**
 * Applies calibration to a raw score
 */
export const applyCalibration = async (
  supabase: SupabaseClient,
  gameId: string,
  rawScore: number,
  gameDifficulty?: Difficulty
): Promise<CalibrationResult> => {
  const calibration = await getGameCalibration(supabase, gameId);

  // If no calibration data or not calibrated, return raw score
  if (!calibration || !calibration.isCalibrated) {
    return {
      rawScore,
      calibratedScore: rawScore,
      adjustmentApplied: 0,
      calibrationMethod: 'none',
      gameCalibration: calibration,
    };
  }

  // Check confidence threshold
  if (calibration.calibrationConfidence < CALIBRATION_CONFIG.minConfidenceForCalibration) {
    return {
      rawScore,
      calibratedScore: rawScore,
      adjustmentApplied: 0,
      calibrationMethod: 'low_confidence',
      gameCalibration: calibration,
    };
  }

  // Apply calibration with strength factor
  let adjustedScore = rawScore;
  let adjustment = 0;

  if (calibration.calibrationMethod === 'offset') {
    // Apply offset with strength factor
    adjustment = calibration.calibrationOffset * CALIBRATION_CONFIG.calibrationStrength;

    // Clamp adjustment to max allowed
    adjustment = Math.max(
      -CALIBRATION_CONFIG.maxCalibrationOffset,
      Math.min(CALIBRATION_CONFIG.maxCalibrationOffset, adjustment)
    );

    adjustedScore = rawScore + adjustment;
  } else if (calibration.calibrationMethod === 'scale') {
    // Apply scale adjustment
    const scale = 1 + (calibration.calibrationScale - 1) * CALIBRATION_CONFIG.calibrationStrength;
    adjustedScore = rawScore * scale;
    adjustment = adjustedScore - rawScore;
  }

  // Clamp to valid range
  adjustedScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));

  return {
    rawScore,
    calibratedScore: adjustedScore,
    adjustmentApplied: Math.round(adjustment),
    calibrationMethod: calibration.calibrationMethod,
    gameCalibration: calibration,
  };
};

/**
 * Calculates calibration for a game based on its scoring data
 */
export const calculateGameCalibration = async (
  supabase: SupabaseClient,
  gameId: string,
  gameTitle: string,
  skillCategory: string,
  difficulty: Difficulty
): Promise<GameCalibration | null> => {
  try {
    // Get scoring statistics for this game
    const { data: stats, error: statsError } = await supabase
      .from('scoring_analytics')
      .select('final_score')
      .eq('game_id', gameId);

    if (statsError || !stats || stats.length === 0) {
      return null;
    }

    const scores = stats.map(s => s.final_score);
    const sampleCount = scores.length;

    // Calculate statistics
    const avgScore = scores.reduce((a, b) => a + b, 0) / sampleCount;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores[Math.floor(sampleCount / 2)];
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / sampleCount;
    const stdDev = Math.sqrt(variance);
    const p25 = sortedScores[Math.floor(sampleCount * 0.25)];
    const p75 = sortedScores[Math.floor(sampleCount * 0.75)];

    // Get benchmark for this difficulty
    const benchmark = DEFAULT_BENCHMARKS[difficulty];

    // Calculate deviation from expected
    const deviation = avgScore - benchmark.expectedAvgScore;
    const absDeviation = Math.abs(deviation);

    // Determine significance
    let deviationSignificance: 'normal' | 'minor' | 'significant' | 'extreme' = 'normal';
    if (absDeviation >= benchmark.deviationThresholdExtreme) {
      deviationSignificance = 'extreme';
    } else if (absDeviation >= benchmark.deviationThresholdSignificant) {
      deviationSignificance = 'significant';
    } else if (absDeviation >= benchmark.deviationThresholdMinor) {
      deviationSignificance = 'minor';
    }

    // Calculate calibration confidence based on sample size
    const confidence = Math.min(1.0, sampleCount / 100);

    // Determine if calibration should be applied
    const shouldCalibrate =
      sampleCount >= CALIBRATION_CONFIG.minSamplesForCalibration &&
      absDeviation >= CALIBRATION_CONFIG.autoCalibrationThreshold;

    const calibration: GameCalibration = {
      gameId,
      gameTitle,
      skillCategory,
      statedDifficulty: difficulty,
      rawAvgScore: avgScore,
      rawMedianScore: medianScore,
      rawStdDev: stdDev,
      expectedAvgScore: benchmark.expectedAvgScore,
      calibrationOffset: shouldCalibrate ? -deviation : 0,
      calibrationScale: 1.0,
      calibrationMethod: shouldCalibrate ? 'offset' : 'none',
      deviationFromPeer: deviation,
      deviationSignificance,
      isCalibrated: shouldCalibrate,
      calibrationConfidence: confidence,
      sampleCount,
      needsReview: deviationSignificance === 'significant' || deviationSignificance === 'extreme',
      reviewReason:
        deviation >= benchmark.deviationThresholdSignificant
          ? 'Game scoring too easy compared to difficulty level'
          : deviation <= -benchmark.deviationThresholdSignificant
            ? 'Game scoring too hard compared to difficulty level'
            : null,
    };

    // Save to database
    await supabase
      .from('score_calibration')
      .upsert({
        game_id: calibration.gameId,
        game_title: calibration.gameTitle,
        skill_category: calibration.skillCategory,
        stated_difficulty: calibration.statedDifficulty,
        raw_avg_score: calibration.rawAvgScore,
        raw_median_score: calibration.rawMedianScore,
        raw_std_dev: calibration.rawStdDev,
        raw_p25_score: p25,
        raw_p75_score: p75,
        expected_avg_score: calibration.expectedAvgScore,
        expected_std_dev: benchmark.expectedStdDev,
        calibration_offset: calibration.calibrationOffset,
        calibration_scale: calibration.calibrationScale,
        calibration_method: calibration.calibrationMethod,
        deviation_from_peer: calibration.deviationFromPeer,
        deviation_significance: calibration.deviationSignificance,
        is_calibrated: calibration.isCalibrated,
        calibration_confidence: calibration.calibrationConfidence,
        sample_count: calibration.sampleCount,
        needs_review: calibration.needsReview,
        review_reason: calibration.reviewReason,
        last_calibrated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // Clear cache for this game
    calibrationCache.delete(gameId);

    return calibration;
  } catch (err) {
    console.warn('Failed to calculate game calibration:', err);
    return null;
  }
};

/**
 * Runs calibration analysis for all games
 */
export const runCalibrationAnalysis = async (
  supabase: SupabaseClient
): Promise<CalibrationRunResult | null> => {
  try {
    // Call the database function
    const { data, error } = await supabase.rpc('run_calibration_analysis');

    if (error) {
      console.error('Calibration analysis failed:', error);
      return null;
    }

    // Get the run details
    const { data: runData, error: runError } = await supabase
      .from('calibration_runs')
      .select('*')
      .eq('id', data)
      .single();

    if (runError || !runData) {
      return {
        runId: data,
        gamesAnalyzed: 0,
        gamesCalibrated: 0,
        gamesFlagged: 0,
        gamesTooEasy: [],
        gamesTooHard: [],
        durationMs: 0,
      };
    }

    // Clear all cache after calibration run
    calibrationCache.clear();

    return {
      runId: runData.id,
      gamesAnalyzed: runData.games_analyzed,
      gamesCalibrated: runData.games_calibrated,
      gamesFlagged: runData.games_flagged,
      gamesTooEasy: runData.games_too_easy || [],
      gamesTooHard: runData.games_too_hard || [],
      durationMs: runData.run_duration_ms,
    };
  } catch (err) {
    console.error('Calibration analysis exception:', err);
    return null;
  }
};

/**
 * Gets calibration report across all games
 */
export const getCalibrationReport = async (
  supabase: SupabaseClient
): Promise<CalibrationReport[]> => {
  try {
    const { data, error } = await supabase.rpc('get_calibration_report');

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      difficulty: row.difficulty as Difficulty,
      gameCount: row.game_count,
      avgDeviation: row.avg_deviation,
      gamesNeedingReview: row.games_needing_review,
      gamesCalibrated: row.games_calibrated,
      tooEasyCount: row.too_easy_count,
      tooHardCount: row.too_hard_count,
    }));
  } catch (err) {
    console.warn('Failed to get calibration report:', err);
    return [];
  }
};

/**
 * Gets games that need review
 */
export const getGamesNeedingReview = async (
  supabase: SupabaseClient
): Promise<GameCalibration[]> => {
  try {
    const { data, error } = await supabase
      .from('score_calibration')
      .select('*')
      .eq('needs_review', true)
      .order('deviation_from_peer', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      gameId: row.game_id,
      gameTitle: row.game_title,
      skillCategory: row.skill_category,
      statedDifficulty: row.stated_difficulty as Difficulty,
      rawAvgScore: row.raw_avg_score,
      rawMedianScore: row.raw_median_score,
      rawStdDev: row.raw_std_dev,
      expectedAvgScore: row.expected_avg_score,
      calibrationOffset: row.calibration_offset || 0,
      calibrationScale: row.calibration_scale || 1.0,
      calibrationMethod: row.calibration_method || 'none',
      deviationFromPeer: row.deviation_from_peer,
      deviationSignificance: row.deviation_significance || 'normal',
      isCalibrated: row.is_calibrated || false,
      calibrationConfidence: row.calibration_confidence || 0,
      sampleCount: row.sample_count || 0,
      needsReview: row.needs_review || false,
      reviewReason: row.review_reason,
    }));
  } catch (err) {
    console.warn('Failed to get games needing review:', err);
    return [];
  }
};

/**
 * Manually sets calibration for a game
 */
export const setGameCalibration = async (
  supabase: SupabaseClient,
  gameId: string,
  offset: number,
  method: 'offset' | 'scale' | 'none' = 'offset'
): Promise<boolean> => {
  try {
    // Get current calibration for history
    const current = await getGameCalibration(supabase, gameId);

    // Log history if exists
    if (current) {
      await supabase.from('calibration_history').insert({
        game_id: gameId,
        prev_calibration_offset: current.calibrationOffset,
        prev_calibration_scale: current.calibrationScale,
        prev_raw_avg_score: current.rawAvgScore,
        prev_sample_count: current.sampleCount,
        new_calibration_offset: offset,
        new_calibration_scale: 1.0,
        new_raw_avg_score: current.rawAvgScore,
        new_sample_count: current.sampleCount,
        change_reason: 'Manual adjustment',
        triggered_by: 'manual',
      });
    }

    // Update calibration
    const { error } = await supabase
      .from('score_calibration')
      .update({
        calibration_offset: offset,
        calibration_method: method,
        is_calibrated: method !== 'none',
        needs_review: false,
        last_calibrated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('game_id', gameId);

    // Clear cache
    calibrationCache.delete(gameId);

    return !error;
  } catch (err) {
    console.warn('Failed to set game calibration:', err);
    return false;
  }
};

/**
 * Formats calibration info for feedback display
 */
export const formatCalibrationFeedback = (result: CalibrationResult): string => {
  if (result.adjustmentApplied === 0) {
    return '';
  }

  const direction = result.adjustmentApplied > 0 ? 'bonus' : 'adjustment';
  const amount = Math.abs(result.adjustmentApplied);
  const sign = result.adjustmentApplied > 0 ? '+' : '-';

  return `<p style="color:#8b5cf6;font-size:0.9em;margin-top:8px;">
    <em>Score includes ${sign}${amount} point difficulty ${direction} for balanced comparison.</em>
  </p>`;
};

/**
 * Gets difficulty benchmark
 */
export const getDifficultyBenchmark = async (
  supabase: SupabaseClient,
  difficulty: Difficulty
): Promise<DifficultyBenchmark> => {
  try {
    const { data, error } = await supabase
      .from('difficulty_benchmarks')
      .select('*')
      .eq('difficulty', difficulty)
      .single();

    if (error || !data) {
      return DEFAULT_BENCHMARKS[difficulty];
    }

    return {
      difficulty,
      expectedAvgScore: data.expected_avg_score,
      expectedMedianScore: data.expected_median_score,
      expectedStdDev: data.expected_std_dev,
      expectedP25: data.expected_p25,
      expectedP75: data.expected_p75,
      acceptableAvgMin: data.acceptable_avg_min,
      acceptableAvgMax: data.acceptable_avg_max,
      intermediatePlayerExpected: data.intermediate_player_expected,
      deviationThresholdMinor: data.deviation_threshold_minor,
      deviationThresholdSignificant: data.deviation_threshold_significant,
      deviationThresholdExtreme: data.deviation_threshold_extreme,
    };
  } catch (err) {
    return DEFAULT_BENCHMARKS[difficulty];
  }
};

/**
 * Clears the calibration cache (useful after batch updates)
 */
export const clearCalibrationCache = (): void => {
  calibrationCache.clear();
};
