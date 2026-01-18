/**
 * Adaptive Difficulty System
 *
 * Dynamically adjusts game difficulty recommendations based on player
 * performance history. Recommends easier games when struggling,
 * harder games when excelling.
 *
 * @version 1.0.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Game, Difficulty, SkillCategory } from '../../types.js';

// ============================================================================
// Types
// ============================================================================

export interface DifficultyProfile {
  skillCategory: string;
  difficulty: Difficulty;
  attempts: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  masteryScore: number;
  gamesAbove80: number;
  gamesAbove90: number;
  consecutiveHighScores: number;
  readyForNext: boolean;
  readinessConfidence: number;
  lastAttemptAt: string | null;
}

export interface DifficultyRecommendation {
  recommendedDifficulty: Difficulty;
  confidence: number;
  reasoning: string;
  alternativeDifficulty: Difficulty;
}

export interface SkillDifficultySummary {
  skillCategory: string;
  currentLevel: Difficulty;
  masteryAtCurrent: number;
  readyForNext: boolean;
  totalAttempts: number;
  avgScore: number;
  recommendation: string;
}

export interface GameRecommendation {
  game: Game;
  recommendationType: 'next_challenge' | 'practice' | 'stretch_goal' | 'consolidation' | 'foundation';
  recommendationReason: string;
  predictedScoreRange: [number, number];
  difficultyMatch: 'too_easy' | 'just_right' | 'challenging' | 'stretch';
  priority: number;
  confidence: number;
  skillGapAddressed?: string[];
}

export interface DifficultyUpdateResult {
  masteryScore: number;
  readyForNext: boolean;
  shouldDemote: boolean;
  recommendation: string;
}

export interface PlayerDifficultyContext {
  profiles: DifficultyProfile[];
  summaries: SkillDifficultySummary[];
  overallLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  strongestSkills: string[];
  weakestSkills: string[];
  recommendedFocus: string;
}

export interface DifficultyFeedback {
  difficultyAssessment: string;
  performanceVsExpected: 'exceeded' | 'met' | 'below';
  adaptiveMessage: string;
  nextStepRecommendation: string;
  shouldShowDifficultyHint: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

export const DIFFICULTY_CONFIG = {
  // Score thresholds for mastery
  masteryThreshold: 80,
  excellenceThreshold: 90,
  passingThreshold: 60,
  strugglingThreshold: 50,

  // Requirements for promotion
  minAttemptsForPromotion: 3,
  minHighScoresForPromotion: 2,
  minConsecutiveHighScores: 2,
  promotionAvgThreshold: 75,

  // Requirements for demotion suggestion
  minAttemptsForDemotion: 3,
  demotionAvgThreshold: 50,

  // Prediction confidence thresholds
  highConfidenceAttempts: 10,
  mediumConfidenceAttempts: 5,

  // Score prediction variance by difficulty
  scoreVariance: {
    easy: 15,
    medium: 20,
    hard: 25,
    expert: 30,
  },

  // Expected score ranges by player level and game difficulty
  expectedScores: {
    beginner: { easy: [55, 75], medium: [40, 60], hard: [25, 45], expert: [15, 35] },
    intermediate: { easy: [70, 85], medium: [55, 75], hard: [40, 60], expert: [30, 50] },
    advanced: { easy: [80, 95], medium: [70, 85], hard: [55, 75], expert: [50, 70] },
    expert: { easy: [85, 100], medium: [80, 95], hard: [70, 90], expert: [75, 95] },
  } as Record<string, Record<Difficulty, [number, number]>>,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Update player's difficulty profile after an attempt
 */
export const updateDifficultyProfile = async (
  supabase: SupabaseClient,
  playerId: string,
  skillCategory: SkillCategory,
  difficulty: Difficulty,
  score: number
): Promise<DifficultyUpdateResult> => {
  try {
    const { data, error } = await supabase.rpc('update_difficulty_profile', {
      p_player_id: playerId,
      p_skill_category: skillCategory,
      p_difficulty: difficulty,
      p_score: score,
    });

    if (error) {
      console.warn('[AdaptiveDifficulty] RPC failed, using fallback:', error.message);
      return updateDifficultyProfileFallback(supabase, playerId, skillCategory, difficulty, score);
    }

    const result = data?.[0];
    return {
      masteryScore: result?.mastery_score ?? 0,
      readyForNext: result?.ready_for_next ?? false,
      shouldDemote: result?.should_demote ?? false,
      recommendation: result?.recommendation ?? 'Keep practicing!',
    };
  } catch (err) {
    console.error('[AdaptiveDifficulty] Error updating profile:', err);
    return {
      masteryScore: 0,
      readyForNext: false,
      shouldDemote: false,
      recommendation: 'Keep practicing!',
    };
  }
};

/**
 * Fallback for updating difficulty profile when RPC not available
 */
const updateDifficultyProfileFallback = async (
  supabase: SupabaseClient,
  playerId: string,
  skillCategory: SkillCategory,
  difficulty: Difficulty,
  score: number
): Promise<DifficultyUpdateResult> => {
  try {
    // Get existing profile
    const { data: existing } = await supabase
      .from('player_difficulty_profile')
      .select('*')
      .eq('player_id', playerId)
      .eq('skill_category', skillCategory)
      .eq('difficulty', difficulty)
      .single();

    const isHighScore = score >= 75;
    const isExcellent = score >= 80;
    const isVeryHigh = score >= 90;

    if (!existing) {
      // Create new profile
      const newProfile = {
        player_id: playerId,
        skill_category: skillCategory,
        difficulty: difficulty,
        attempts: 1,
        total_score: score,
        avg_score: score,
        best_score: score,
        worst_score: score,
        games_above_80: isExcellent ? 1 : 0,
        games_above_90: isVeryHigh ? 1 : 0,
        consecutive_high_scores: isHighScore ? 1 : 0,
        mastery_score: score * 0.4, // Initial mastery based on first score
        ready_for_next: false,
        readiness_confidence: 0.1,
        first_attempt_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
      };

      await supabase.from('player_difficulty_profile').insert(newProfile);

      return {
        masteryScore: newProfile.mastery_score,
        readyForNext: false,
        shouldDemote: false,
        recommendation: 'Great start! Keep practicing to build mastery.',
      };
    }

    // Calculate updated values
    const newAttempts = existing.attempts + 1;
    const newTotalScore = existing.total_score + score;
    const newAvgScore = newTotalScore / newAttempts;
    const newBestScore = Math.max(existing.best_score, score);
    const newWorstScore = Math.min(existing.worst_score, score);
    const newGamesAbove80 = existing.games_above_80 + (isExcellent ? 1 : 0);
    const newGamesAbove90 = existing.games_above_90 + (isVeryHigh ? 1 : 0);
    const newConsecutive = isHighScore ? existing.consecutive_high_scores + 1 : 0;

    // Calculate mastery score
    const consistencyScore = newAttempts > 0
      ? (1 - (newBestScore - newWorstScore) / 100) * 20
      : 10;
    const highScoreRatio = newAttempts > 0
      ? (newGamesAbove80 / newAttempts) * 20
      : 0;
    const streakScore = (Math.min(newConsecutive, 5) / 5) * 20;
    const masteryScore = newAvgScore * 0.4 + consistencyScore + highScoreRatio + streakScore;

    // Determine readiness
    const readyForNext = (
      newAttempts >= DIFFICULTY_CONFIG.minAttemptsForPromotion &&
      newAvgScore >= DIFFICULTY_CONFIG.promotionAvgThreshold &&
      newGamesAbove80 >= DIFFICULTY_CONFIG.minHighScoresForPromotion &&
      newConsecutive >= DIFFICULTY_CONFIG.minConsecutiveHighScores
    );

    const shouldDemote = (
      newAttempts >= DIFFICULTY_CONFIG.minAttemptsForDemotion &&
      newAvgScore < DIFFICULTY_CONFIG.demotionAvgThreshold &&
      difficulty !== 'easy'
    );

    // Generate recommendation
    let recommendation: string;
    if (shouldDemote) {
      recommendation = 'Consider practicing at a lower difficulty level';
    } else if (readyForNext && difficulty !== 'hard') {
      recommendation = 'Ready for more challenging games!';
    } else if (newAvgScore >= 85) {
      recommendation = 'Excellent mastery - try pushing to harder games';
    } else if (newAvgScore >= 70) {
      recommendation = 'Good progress - keep practicing at this level';
    } else if (newAvgScore >= 50) {
      recommendation = 'Building skills - focus on fundamentals';
    } else {
      recommendation = 'Consider reviewing basics and trying easier games';
    }

    // Update profile
    await supabase
      .from('player_difficulty_profile')
      .update({
        attempts: newAttempts,
        total_score: newTotalScore,
        avg_score: newAvgScore,
        best_score: newBestScore,
        worst_score: newWorstScore,
        games_above_80: newGamesAbove80,
        games_above_90: newGamesAbove90,
        consecutive_high_scores: newConsecutive,
        last_high_score_streak: Math.max(existing.last_high_score_streak || 0, newConsecutive),
        mastery_score: masteryScore,
        ready_for_next: readyForNext,
        readiness_confidence: Math.min(newAttempts / 10, 1),
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId)
      .eq('skill_category', skillCategory)
      .eq('difficulty', difficulty);

    return {
      masteryScore,
      readyForNext,
      shouldDemote,
      recommendation,
    };
  } catch (err) {
    console.error('[AdaptiveDifficulty] Fallback update failed:', err);
    return {
      masteryScore: 0,
      readyForNext: false,
      shouldDemote: false,
      recommendation: 'Keep practicing!',
    };
  }
};

/**
 * Get recommended difficulty for a player in a skill category
 */
export const getRecommendedDifficulty = async (
  supabase: SupabaseClient,
  playerId: string,
  skillCategory: SkillCategory
): Promise<DifficultyRecommendation> => {
  try {
    const { data, error } = await supabase.rpc('get_recommended_difficulty', {
      p_player_id: playerId,
      p_skill_category: skillCategory,
    });

    if (error) {
      console.warn('[AdaptiveDifficulty] get_recommended_difficulty failed:', error.message);
      return getRecommendedDifficultyFallback(supabase, playerId, skillCategory);
    }

    const result = data?.[0];
    return {
      recommendedDifficulty: (result?.recommended_difficulty || 'easy') as Difficulty,
      confidence: result?.confidence ?? 0.5,
      reasoning: result?.reasoning ?? 'Based on your performance history',
      alternativeDifficulty: (result?.alternative_difficulty || 'medium') as Difficulty,
    };
  } catch (err) {
    console.error('[AdaptiveDifficulty] Error getting recommendation:', err);
    return {
      recommendedDifficulty: 'easy',
      confidence: 0.5,
      reasoning: 'Start with fundamentals',
      alternativeDifficulty: 'medium',
    };
  }
};

/**
 * Fallback for difficulty recommendation
 */
const getRecommendedDifficultyFallback = async (
  supabase: SupabaseClient,
  playerId: string,
  skillCategory: SkillCategory
): Promise<DifficultyRecommendation> => {
  try {
    // Get profiles for all difficulties
    const { data: profiles } = await supabase
      .from('player_difficulty_profile')
      .select('*')
      .eq('player_id', playerId)
      .eq('skill_category', skillCategory);

    if (!profiles || profiles.length === 0) {
      return {
        recommendedDifficulty: 'easy',
        confidence: 0.5,
        reasoning: 'New player - start with fundamentals',
        alternativeDifficulty: 'medium',
      };
    }

    const easy = profiles.find(p => p.difficulty === 'easy');
    const medium = profiles.find(p => p.difficulty === 'medium');
    const hard = profiles.find(p => p.difficulty === 'hard');

    // Decision logic
    if (hard && hard.avg_score >= 70 && hard.attempts >= 2) {
      return {
        recommendedDifficulty: 'hard',
        confidence: 0.9,
        reasoning: 'Strong performance at hard difficulty',
        alternativeDifficulty: 'hard',
      };
    }

    if (medium && medium.ready_for_next) {
      return {
        recommendedDifficulty: 'hard',
        confidence: 0.7,
        reasoning: 'Mastered medium difficulty, ready for challenge',
        alternativeDifficulty: 'medium',
      };
    }

    if (medium && medium.avg_score >= 60 && medium.attempts >= 2) {
      return {
        recommendedDifficulty: 'medium',
        confidence: 0.8,
        reasoning: 'Solid performance at medium difficulty',
        alternativeDifficulty: medium.avg_score >= 75 ? 'hard' : 'easy',
      };
    }

    if (easy && easy.ready_for_next) {
      return {
        recommendedDifficulty: 'medium',
        confidence: 0.7,
        reasoning: 'Mastered easy difficulty, ready for medium',
        alternativeDifficulty: 'easy',
      };
    }

    if (medium && medium.avg_score < 50) {
      return {
        recommendedDifficulty: 'easy',
        confidence: 0.7,
        reasoning: 'Building fundamentals at easier level recommended',
        alternativeDifficulty: 'medium',
      };
    }

    // Default
    return {
      recommendedDifficulty: 'medium',
      confidence: 0.5,
      reasoning: 'Balanced difficulty recommendation',
      alternativeDifficulty: 'easy',
    };
  } catch (err) {
    console.error('[AdaptiveDifficulty] Fallback recommendation failed:', err);
    return {
      recommendedDifficulty: 'easy',
      confidence: 0.5,
      reasoning: 'Start with fundamentals',
      alternativeDifficulty: 'medium',
    };
  }
};

/**
 * Get player's difficulty summary across all skills
 */
export const getPlayerDifficultySummary = async (
  supabase: SupabaseClient,
  playerId: string
): Promise<SkillDifficultySummary[]> => {
  try {
    const { data, error } = await supabase.rpc('get_player_difficulty_summary', {
      p_player_id: playerId,
    });

    if (error) {
      console.warn('[AdaptiveDifficulty] get_player_difficulty_summary failed:', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      skillCategory: row.skill_category,
      currentLevel: row.current_level as Difficulty,
      masteryAtCurrent: row.mastery_at_current,
      readyForNext: row.ready_for_next,
      totalAttempts: row.total_attempts,
      avgScore: row.avg_score,
      recommendation: row.recommendation,
    }));
  } catch (err) {
    console.error('[AdaptiveDifficulty] Error getting summary:', err);
    return [];
  }
};

/**
 * Get full difficulty context for a player
 */
export const getPlayerDifficultyContext = async (
  supabase: SupabaseClient,
  playerId: string
): Promise<PlayerDifficultyContext> => {
  try {
    // Get all profiles
    const { data: profiles } = await supabase
      .from('player_difficulty_profile')
      .select('*')
      .eq('player_id', playerId);

    // Get summaries
    const summaries = await getPlayerDifficultySummary(supabase, playerId);

    // Calculate overall level
    const allAvgScores = (profiles ?? []).map(p => p.avg_score);
    const overallAvg = allAvgScores.length > 0
      ? allAvgScores.reduce((a, b) => a + b, 0) / allAvgScores.length
      : 0;

    let overallLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    if (overallAvg >= 85) overallLevel = 'expert';
    else if (overallAvg >= 70) overallLevel = 'advanced';
    else if (overallAvg >= 50) overallLevel = 'intermediate';
    else overallLevel = 'beginner';

    // Find strongest and weakest skills
    const skillScores = new Map<string, number[]>();
    for (const profile of profiles ?? []) {
      const scores = skillScores.get(profile.skill_category) || [];
      scores.push(profile.avg_score);
      skillScores.set(profile.skill_category, scores);
    }

    const skillAvgs = Array.from(skillScores.entries()).map(([skill, scores]) => ({
      skill,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));
    skillAvgs.sort((a, b) => b.avg - a.avg);

    const strongestSkills = skillAvgs.slice(0, 3).map(s => s.skill);
    const weakestSkills = skillAvgs.slice(-3).reverse().map(s => s.skill);

    // Generate recommended focus
    let recommendedFocus: string;
    if (weakestSkills.length > 0 && skillAvgs.length > 0) {
      const weakest = skillAvgs[skillAvgs.length - 1];
      if (weakest.avg < 50) {
        recommendedFocus = `Focus on improving ${weakest.skill} skills`;
      } else {
        recommendedFocus = 'Great balance - try stretching into harder games';
      }
    } else {
      recommendedFocus = 'Explore different skill categories';
    }

    return {
      profiles: (profiles ?? []).map(p => ({
        skillCategory: p.skill_category,
        difficulty: p.difficulty as Difficulty,
        attempts: p.attempts,
        avgScore: p.avg_score,
        bestScore: p.best_score,
        worstScore: p.worst_score,
        masteryScore: p.mastery_score,
        gamesAbove80: p.games_above_80,
        gamesAbove90: p.games_above_90,
        consecutiveHighScores: p.consecutive_high_scores,
        readyForNext: p.ready_for_next,
        readinessConfidence: p.readiness_confidence,
        lastAttemptAt: p.last_attempt_at,
      })),
      summaries,
      overallLevel,
      strongestSkills,
      weakestSkills,
      recommendedFocus,
    };
  } catch (err) {
    console.error('[AdaptiveDifficulty] Error getting context:', err);
    return {
      profiles: [],
      summaries: [],
      overallLevel: 'beginner',
      strongestSkills: [],
      weakestSkills: [],
      recommendedFocus: 'Start exploring games!',
    };
  }
};

// ============================================================================
// Game Recommendations
// ============================================================================

/**
 * Get personalized game recommendations for a player
 */
export const getGameRecommendations = async (
  supabase: SupabaseClient,
  playerId: string,
  availableGames: Game[],
  options: {
    limit?: number;
    currentGameId?: string;
    focusSkill?: SkillCategory;
  } = {}
): Promise<GameRecommendation[]> => {
  const { limit = 5, currentGameId, focusSkill } = options;

  try {
    // Get player's difficulty context
    const context = await getPlayerDifficultyContext(supabase, playerId);

    // Get player's attempt history to know what they've played
    const { data: attempts } = await supabase
      .from('players')
      .select('progress')
      .eq('id', playerId)
      .single();

    const playedGameIds = new Set(
      (attempts?.progress?.attempts ?? []).map((a: any) => a.gameId)
    );

    const recommendations: GameRecommendation[] = [];

    for (const game of availableGames) {
      // Skip current game
      if (game.id === currentGameId) continue;

      // Get recommended difficulty for this skill
      const diffRec = await getRecommendedDifficulty(supabase, playerId, game.skillCategory);

      // Determine game's match to player
      const difficultyMatch = determineDifficultyMatch(
        game.difficulty,
        diffRec.recommendedDifficulty,
        context.overallLevel
      );

      // Calculate predicted score range
      const predictedRange = predictScoreRange(
        game.difficulty,
        context.overallLevel,
        context.profiles.find(p =>
          p.skillCategory === game.skillCategory && p.difficulty === game.difficulty
        )
      );

      // Determine recommendation type
      const recType = determineRecommendationType(
        game,
        difficultyMatch,
        playedGameIds.has(game.id),
        context
      );

      // Calculate priority
      const priority = calculateRecommendationPriority(
        recType,
        difficultyMatch,
        diffRec.confidence,
        focusSkill === game.skillCategory
      );

      // Generate recommendation reason
      const reason = generateRecommendationReason(
        recType,
        difficultyMatch,
        game,
        context
      );

      recommendations.push({
        game,
        recommendationType: recType,
        recommendationReason: reason,
        predictedScoreRange: predictedRange,
        difficultyMatch,
        priority,
        confidence: diffRec.confidence,
        skillGapAddressed: context.weakestSkills.includes(game.skillCategory)
          ? [game.skillCategory]
          : undefined,
      });
    }

    // Sort by priority and return top recommendations
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  } catch (err) {
    console.error('[AdaptiveDifficulty] Error getting recommendations:', err);
    return [];
  }
};

/**
 * Determine how well a game's difficulty matches the player
 */
const determineDifficultyMatch = (
  gameDifficulty: Difficulty,
  recommendedDifficulty: Difficulty,
  playerLevel: string
): 'too_easy' | 'just_right' | 'challenging' | 'stretch' => {
  const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
  const gameLevel = difficultyOrder[gameDifficulty];
  const recLevel = difficultyOrder[recommendedDifficulty];
  const diff = gameLevel - recLevel;

  if (diff === 0) return 'just_right';
  if (diff === -1) return 'too_easy';
  if (diff === 1) return 'challenging';
  if (diff >= 2) return 'stretch';
  return 'too_easy';
};

/**
 * Predict score range for a player on a game
 */
const predictScoreRange = (
  gameDifficulty: Difficulty,
  playerLevel: string,
  existingProfile?: DifficultyProfile
): [number, number] => {
  // If we have history at this level, use it
  if (existingProfile && existingProfile.attempts >= 2) {
    const variance = DIFFICULTY_CONFIG.scoreVariance[gameDifficulty];
    const predicted = existingProfile.avgScore;
    return [
      Math.max(0, Math.round(predicted - variance)),
      Math.min(100, Math.round(predicted + variance)),
    ];
  }

  // Use expected scores based on player level
  const expected = DIFFICULTY_CONFIG.expectedScores[playerLevel]?.[gameDifficulty];
  return expected || [40, 70];
};

/**
 * Determine the type of recommendation for a game
 */
const determineRecommendationType = (
  game: Game,
  difficultyMatch: string,
  hasPlayed: boolean,
  context: PlayerDifficultyContext
): 'next_challenge' | 'practice' | 'stretch_goal' | 'consolidation' | 'foundation' => {
  const isWeakSkill = context.weakestSkills.includes(game.skillCategory);

  if (difficultyMatch === 'stretch') {
    return 'stretch_goal';
  }

  if (difficultyMatch === 'too_easy' && !isWeakSkill) {
    return 'foundation';
  }

  if (difficultyMatch === 'challenging') {
    return 'next_challenge';
  }

  if (hasPlayed || isWeakSkill) {
    return 'practice';
  }

  if (difficultyMatch === 'just_right') {
    return 'consolidation';
  }

  return 'practice';
};

/**
 * Calculate priority score for recommendation
 */
const calculateRecommendationPriority = (
  recType: string,
  difficultyMatch: string,
  confidence: number,
  isFocusSkill: boolean
): number => {
  let priority = 50;

  // Boost for focus skill
  if (isFocusSkill) priority += 30;

  // Adjust by recommendation type
  switch (recType) {
    case 'next_challenge':
      priority += 20;
      break;
    case 'practice':
      priority += 15;
      break;
    case 'consolidation':
      priority += 10;
      break;
    case 'stretch_goal':
      priority += 5;
      break;
    case 'foundation':
      priority += 0;
      break;
  }

  // Adjust by difficulty match
  if (difficultyMatch === 'just_right') priority += 15;
  else if (difficultyMatch === 'challenging') priority += 10;
  else if (difficultyMatch === 'too_easy') priority -= 10;

  // Adjust by confidence
  priority += Math.round(confidence * 10);

  return priority;
};

/**
 * Generate human-readable recommendation reason
 */
const generateRecommendationReason = (
  recType: string,
  difficultyMatch: string,
  game: Game,
  context: PlayerDifficultyContext
): string => {
  const skillName = game.skillCategory.replace(/-/g, ' ');

  switch (recType) {
    case 'next_challenge':
      return `Ready for a challenge in ${skillName} - this ${game.difficulty} game will push your skills!`;
    case 'practice':
      if (context.weakestSkills.includes(game.skillCategory)) {
        return `Practice opportunity in ${skillName} - one of your growth areas`;
      }
      return `Good practice for ${skillName} at ${game.difficulty} level`;
    case 'stretch_goal':
      return `Stretch goal in ${skillName} - challenging but achievable!`;
    case 'consolidation':
      return `Solidify your ${skillName} skills at ${game.difficulty} level`;
    case 'foundation':
      return `Build your foundation in ${skillName} with this ${game.difficulty} game`;
    default:
      return `Recommended for your ${context.overallLevel} level`;
  }
};

// ============================================================================
// Adaptive Feedback
// ============================================================================

/**
 * Generate adaptive feedback based on difficulty match
 */
export const generateDifficultyFeedback = (
  score: number,
  gameDifficulty: Difficulty,
  playerLevel: string,
  updateResult: DifficultyUpdateResult
): DifficultyFeedback => {
  const expectedRange = DIFFICULTY_CONFIG.expectedScores[playerLevel]?.[gameDifficulty]
    || [50, 75];
  const [expectedMin, expectedMax] = expectedRange;

  // Determine performance vs expected
  let performanceVsExpected: 'exceeded' | 'met' | 'below';
  if (score > expectedMax) {
    performanceVsExpected = 'exceeded';
  } else if (score >= expectedMin) {
    performanceVsExpected = 'met';
  } else {
    performanceVsExpected = 'below';
  }

  // Generate difficulty assessment
  let difficultyAssessment: string;
  if (gameDifficulty === 'hard') {
    if (score >= 80) {
      difficultyAssessment = 'You handled this hard challenge excellently!';
    } else if (score >= 60) {
      difficultyAssessment = 'Good effort on a challenging game.';
    } else {
      difficultyAssessment = 'Hard games are meant to challenge - don\'t be discouraged.';
    }
  } else if (gameDifficulty === 'medium') {
    if (score >= 80) {
      difficultyAssessment = 'Strong performance - consider trying harder games!';
    } else if (score >= 60) {
      difficultyAssessment = 'Solid work at medium difficulty.';
    } else {
      difficultyAssessment = 'Keep practicing at this level to build mastery.';
    }
  } else {
    if (score >= 85) {
      difficultyAssessment = 'You\'ve mastered this level - time for a challenge!';
    } else if (score >= 70) {
      difficultyAssessment = 'Good progress at easy level.';
    } else {
      difficultyAssessment = 'Focus on the fundamentals here before moving up.';
    }
  }

  // Generate adaptive message
  let adaptiveMessage: string;
  if (updateResult.readyForNext && gameDifficulty !== 'hard') {
    adaptiveMessage = `You're ready to move up! Try ${gameDifficulty === 'easy' ? 'medium' : 'hard'} difficulty next.`;
  } else if (updateResult.shouldDemote) {
    adaptiveMessage = 'Consider trying easier games to build confidence and fundamentals.';
  } else if (performanceVsExpected === 'exceeded') {
    adaptiveMessage = 'Excellent performance! You\'re exceeding expectations at this level.';
  } else if (performanceVsExpected === 'met') {
    adaptiveMessage = 'Right on track for your level. Keep building consistency.';
  } else {
    adaptiveMessage = 'This was a challenging one. Review the feedback and try again!';
  }

  // Next step recommendation
  const nextStepRecommendation = updateResult.recommendation;

  // Should we show difficulty hint?
  const shouldShowDifficultyHint = updateResult.readyForNext || updateResult.shouldDemote;

  return {
    difficultyAssessment,
    performanceVsExpected,
    adaptiveMessage,
    nextStepRecommendation,
    shouldShowDifficultyHint,
  };
};

/**
 * Format difficulty feedback as HTML for display
 */
export const formatDifficultyFeedbackHtml = (
  feedback: DifficultyFeedback,
  updateResult: DifficultyUpdateResult
): string => {
  const parts: string[] = [];

  // Performance indicator
  const perfIcon = feedback.performanceVsExpected === 'exceeded' ? '🌟' :
    feedback.performanceVsExpected === 'met' ? '✓' : '💪';
  const perfColor = feedback.performanceVsExpected === 'exceeded' ? '#22c55e' :
    feedback.performanceVsExpected === 'met' ? '#60a5fa' : '#f97316';

  parts.push(`
<div style="background:#0f172a;padding:10px;border-radius:8px;border-left:4px solid ${perfColor};margin-bottom:10px;">
  <p><strong>${perfIcon} ${feedback.difficultyAssessment}</strong></p>
  <p style="color:#94a3b8;font-size:0.9em;">${feedback.adaptiveMessage}</p>
</div>`);

  // Show promotion/demotion hint if applicable
  if (feedback.shouldShowDifficultyHint) {
    const hintBg = updateResult.readyForNext ? '#052e16' : '#3f0a0a';
    const hintBorder = updateResult.readyForNext ? '#22c55e' : '#f97316';
    const hintIcon = updateResult.readyForNext ? '⬆️' : '📚';

    parts.push(`
<div style="background:${hintBg};padding:8px 12px;border-radius:6px;border:1px solid ${hintBorder};margin-bottom:10px;">
  <p>${hintIcon} <strong>${feedback.nextStepRecommendation}</strong></p>
</div>`);
  }

  // Mastery progress bar
  const masteryPercent = Math.min(100, Math.round(updateResult.masteryScore));
  const masteryColor = masteryPercent >= 75 ? '#22c55e' :
    masteryPercent >= 50 ? '#eab308' : '#f97316';

  parts.push(`
<div style="margin-bottom:10px;">
  <p style="font-size:0.85em;color:#94a3b8;margin-bottom:4px;">Mastery Progress: ${masteryPercent}%</p>
  <div style="background:#1e293b;border-radius:4px;height:8px;overflow:hidden;">
    <div style="background:${masteryColor};width:${masteryPercent}%;height:100%;transition:width 0.5s;"></div>
  </div>
</div>`);

  return parts.join('');
};

export default {
  // Configuration
  DIFFICULTY_CONFIG,

  // Profile management
  updateDifficultyProfile,
  getRecommendedDifficulty,
  getPlayerDifficultySummary,
  getPlayerDifficultyContext,

  // Recommendations
  getGameRecommendations,

  // Feedback
  generateDifficultyFeedback,
  formatDifficultyFeedbackHtml,
};
