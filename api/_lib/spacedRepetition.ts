/**
 * Spaced Repetition Service
 *
 * Implements spaced repetition for weak skills based on learning science.
 * Uses SM-2 algorithm principles adapted for skill-based learning.
 *
 * Key concepts:
 * - Easiness Factor (EF): How easy a skill is for a player (1.3-2.5)
 * - Interval: Days between reviews (increases with successful reviews)
 * - Memory Strength: Estimated retention (0-1, decays over time)
 * - Priority: Urgency of review (higher = needs attention sooner)
 *
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { SkillCategory, Game } from '../../types.js';

// ============================================================================
// Types
// ============================================================================

export type SkillStatus = 'new' | 'learning' | 'reviewing' | 'mastered' | 'weak';
export type WeaknessLevel = 'slight' | 'moderate' | 'significant' | 'critical' | null;
export type ReviewUrgency = 'low' | 'normal' | 'high' | 'critical';
export type RecommendationType = 'due_review' | 'weak_skill' | 'overdue' | 'reinforcement' | 'challenge';

export interface SkillMemory {
  skillCategory: SkillCategory;
  easinessFactor: number;
  intervalDays: number;
  repetitions: number;
  lastQuality: number;
  currentScore: number;
  avgScore: number;
  bestScore: number;
  totalAttempts: number;
  successfulAttempts: number;
  memoryStrength: number;
  decayRate: number;
  stability: number;
  nextReviewDate: Date | null;
  isDueForReview: boolean;
  daysOverdue: number;
  priorityScore: number;
  skillStatus: SkillStatus;
  weaknessLevel: WeaknessLevel;
  needsAttention: boolean;
  scoreHistory: number[];
  improvementTrend: 'improving' | 'stable' | 'declining';
  lastAttemptAt: Date | null;
}

export interface DueReview {
  skillCategory: SkillCategory;
  daysOverdue: number;
  memoryStrength: number;
  priorityScore: number;
  lastScore: number;
  avgScore: number;
  weaknessLevel: WeaknessLevel;
  reviewUrgency: ReviewUrgency;
}

export interface WeakSkill {
  skillCategory: SkillCategory;
  weaknessLevel: WeaknessLevel;
  avgScore: number;
  totalAttempts: number;
  improvementTrend: string;
  suggestedAction: string;
}

export interface SkillRecommendation {
  gameId: string;
  gameTitle: string;
  skillCategory: SkillCategory;
  difficulty: string;
  recommendationType: RecommendationType;
  recommendationReason: string;
  priority: number;
  optimalReviewDate: Date | null;
  urgencyLevel: ReviewUrgency;
  predictedScoreRange: [number, number];
}

export interface SM2Result {
  quality: number; // 0-5
  newEasinessFactor: number;
  newInterval: number;
  newRepetitions: number;
}

export interface SkillMemoryUpdate {
  skillStatus: SkillStatus;
  weaknessLevel: WeaknessLevel;
  nextReviewDate: Date;
  priorityScore: number;
}

export interface SpacedRepetitionSummary {
  totalSkillsTracked: number;
  skillsDueForReview: number;
  weakSkillsCount: number;
  masteredSkillsCount: number;
  averageMemoryStrength: number;
  nextReviewIn: number | null; // Days until next review
  recommendations: SkillRecommendation[];
}

// ============================================================================
// Configuration
// ============================================================================

export const SR_CONFIG = {
  // SM-2 Algorithm Parameters
  initialEasinessFactor: 2.5,
  minEasinessFactor: 1.3,
  maxEasinessFactor: 2.5,

  // Quality thresholds (score to SM-2 quality mapping)
  qualityThresholds: {
    perfect: 90, // Quality 5
    good: 80, // Quality 4
    acceptable: 70, // Quality 3 (minimum for success)
    poor: 50, // Quality 2
    veryPoor: 30, // Quality 1
    // Below 30 is Quality 0
  },

  // Weakness thresholds
  weaknessThresholds: {
    critical: 40,
    significant: 55,
    moderate: 70,
    slight: 80,
  },

  // Memory decay
  baseDecayRate: 0.1,
  minStability: 0.5,
  maxStability: 5.0,

  // Review scheduling
  maxIntervalDays: 180, // 6 months max
  overdueGracePeriodDays: 7, // Allow 7 days before critical

  // Recommendation limits
  maxRecommendations: 5,
};

// Skill category display names
const SKILL_NAMES: Record<string, string> = {
  boolean: 'Boolean Search',
  xray: 'X-Ray Search',
  persona: 'Candidate Profiling',
  outreach: 'Outreach Messaging',
  linkedin: 'LinkedIn Sourcing',
  diversity: 'Diversity Sourcing',
  ats: 'ATS Knowledge',
  screening: 'Candidate Screening',
  'job-description': 'Job Description Writing',
  'ai-prompting': 'AI Prompting',
  negotiation: 'Negotiation',
  'talent-intelligence': 'Talent Intelligence',
  multiplatform: 'Multi-Platform Sourcing',
  multi: 'Multi-Skill',
  general: 'General Sourcing',
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate SM-2 algorithm update
 * Returns new memory parameters based on score
 */
export const calculateSM2Update = (
  score: number,
  currentEF: number,
  currentInterval: number,
  currentReps: number
): SM2Result => {
  // Convert score (0-100) to SM-2 quality (0-5)
  let quality: number;
  if (score >= SR_CONFIG.qualityThresholds.perfect) {
    quality = 5;
  } else if (score >= SR_CONFIG.qualityThresholds.good) {
    quality = 4;
  } else if (score >= SR_CONFIG.qualityThresholds.acceptable) {
    quality = 3;
  } else if (score >= SR_CONFIG.qualityThresholds.poor) {
    quality = 2;
  } else if (score >= SR_CONFIG.qualityThresholds.veryPoor) {
    quality = 1;
  } else {
    quality = 0;
  }

  // Calculate new Easiness Factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(SR_CONFIG.minEasinessFactor, Math.min(SR_CONFIG.maxEasinessFactor, newEF));

  // Calculate new interval and repetitions
  let newInterval: number;
  let newReps: number;

  if (quality >= 3) {
    // Successful review
    newReps = currentReps + 1;

    if (newReps === 1) {
      newInterval = 1;
    } else if (newReps === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.min(currentInterval * newEF, SR_CONFIG.maxIntervalDays);
    }
  } else {
    // Failed review - reset
    newReps = 0;
    newInterval = 1;
  }

  return {
    quality,
    newEasinessFactor: newEF,
    newInterval,
    newRepetitions: newReps,
  };
};

/**
 * Calculate memory strength based on time since last review
 * Uses exponential decay model
 */
export const calculateMemoryStrength = (
  lastAttemptAt: Date | null,
  decayRate: number,
  stability: number,
  lastScore: number
): number => {
  if (!lastAttemptAt) {
    return 0.5; // Default for new skills
  }

  const daysSinceReview = (Date.now() - lastAttemptAt.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: R = e^(-decay_rate * days / stability)
  const decay = Math.exp(-decayRate * daysSinceReview / stability);

  // Blend with current score
  const scoreComponent = lastScore / 100;
  return decay * 0.3 + scoreComponent * 0.7;
};

/**
 * Determine weakness level from average score
 */
export const determineWeaknessLevel = (avgScore: number): WeaknessLevel => {
  if (avgScore < SR_CONFIG.weaknessThresholds.critical) return 'critical';
  if (avgScore < SR_CONFIG.weaknessThresholds.significant) return 'significant';
  if (avgScore < SR_CONFIG.weaknessThresholds.moderate) return 'moderate';
  if (avgScore < SR_CONFIG.weaknessThresholds.slight) return 'slight';
  return null;
};

/**
 * Determine skill status
 */
export const determineSkillStatus = (
  totalAttempts: number,
  avgScore: number,
  repetitions: number,
  weaknessLevel: WeaknessLevel
): SkillStatus => {
  if (totalAttempts === 0) return 'new';
  if (avgScore >= 85 && repetitions >= 3) return 'mastered';
  if (weaknessLevel !== null) return 'weak';
  if (repetitions >= 2) return 'reviewing';
  return 'learning';
};

/**
 * Calculate priority score for review urgency
 */
export const calculatePriorityScore = (
  weaknessLevel: WeaknessLevel,
  daysOverdue: number,
  memoryStrength: number
): number => {
  // Base priority from weakness level
  let priority = 0;
  switch (weaknessLevel) {
    case 'critical':
      priority = 100;
      break;
    case 'significant':
      priority = 75;
      break;
    case 'moderate':
      priority = 50;
      break;
    case 'slight':
      priority = 25;
      break;
  }

  // Add urgency for overdue reviews (up to +50)
  priority += Math.min(50, daysOverdue * 5);

  // Reduce priority based on memory strength
  priority *= 1 - memoryStrength * 0.3;

  return Math.round(priority);
};

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Update skill memory after an attempt
 */
export const updateSkillMemory = async (
  supabase: SupabaseClient,
  playerId: string,
  skillCategory: SkillCategory,
  gameId: string,
  score: number
): Promise<SkillMemoryUpdate | null> => {
  try {
    const { data, error } = await supabase.rpc('update_skill_memory', {
      p_player_id: playerId,
      p_skill_category: skillCategory,
      p_game_id: gameId,
      p_score: score,
    });

    if (error || !data || data.length === 0) {
      console.warn('Failed to update skill memory:', error);
      return null;
    }

    const result = data[0];
    return {
      skillStatus: result.skill_status as SkillStatus,
      weaknessLevel: result.weakness_level as WeaknessLevel,
      nextReviewDate: new Date(result.next_review_date),
      priorityScore: result.priority_score,
    };
  } catch (err) {
    console.warn('Skill memory update exception:', err);
    return null;
  }
};

/**
 * Get skills that are due for review
 */
export const getDueReviews = async (
  supabase: SupabaseClient,
  playerId: string,
  limit: number = 5
): Promise<DueReview[]> => {
  try {
    const { data, error } = await supabase.rpc('get_due_reviews', {
      p_player_id: playerId,
      p_limit: limit,
    });

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      skillCategory: row.skill_category as SkillCategory,
      daysOverdue: row.days_overdue,
      memoryStrength: row.memory_strength,
      priorityScore: row.priority_score,
      lastScore: row.last_score,
      avgScore: row.avg_score,
      weaknessLevel: row.weakness_level as WeaknessLevel,
      reviewUrgency: row.review_urgency as ReviewUrgency,
    }));
  } catch (err) {
    console.warn('Failed to get due reviews:', err);
    return [];
  }
};

/**
 * Get weak skills for a player
 */
export const getWeakSkills = async (
  supabase: SupabaseClient,
  playerId: string,
  minAttempts: number = 2
): Promise<WeakSkill[]> => {
  try {
    const { data, error } = await supabase.rpc('get_weak_skills', {
      p_player_id: playerId,
      p_min_attempts: minAttempts,
    });

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      skillCategory: row.skill_category as SkillCategory,
      weaknessLevel: row.weakness_level as WeaknessLevel,
      avgScore: row.avg_score,
      totalAttempts: row.total_attempts,
      improvementTrend: row.improvement_trend,
      suggestedAction: row.suggested_action,
    }));
  } catch (err) {
    console.warn('Failed to get weak skills:', err);
    return [];
  }
};

/**
 * Get all skill memories for a player
 */
export const getPlayerSkillMemories = async (
  supabase: SupabaseClient,
  playerId: string
): Promise<SkillMemory[]> => {
  try {
    const { data, error } = await supabase
      .from('player_skill_memory')
      .select('*')
      .eq('player_id', playerId)
      .order('priority_score', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      skillCategory: row.skill_category as SkillCategory,
      easinessFactor: row.easiness_factor,
      intervalDays: row.interval_days,
      repetitions: row.repetitions,
      lastQuality: row.last_quality,
      currentScore: row.current_score,
      avgScore: row.avg_score,
      bestScore: row.best_score,
      totalAttempts: row.total_attempts,
      successfulAttempts: row.successful_attempts,
      memoryStrength: row.memory_strength,
      decayRate: row.decay_rate,
      stability: row.stability,
      nextReviewDate: row.next_review_date ? new Date(row.next_review_date) : null,
      isDueForReview: row.is_due_for_review,
      daysOverdue: row.days_overdue,
      priorityScore: row.priority_score,
      skillStatus: row.skill_status as SkillStatus,
      weaknessLevel: row.weakness_level as WeaknessLevel,
      needsAttention: row.needs_attention,
      scoreHistory: row.score_history || [],
      improvementTrend: row.improvement_trend,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
    }));
  } catch (err) {
    console.warn('Failed to get player skill memories:', err);
    return [];
  }
};

// ============================================================================
// Recommendation Engine
// ============================================================================

/**
 * Generate game recommendations based on spaced repetition
 */
export const generateRecommendations = async (
  supabase: SupabaseClient,
  playerId: string,
  availableGames: Game[]
): Promise<SkillRecommendation[]> => {
  const recommendations: SkillRecommendation[] = [];

  try {
    // Get due reviews and weak skills
    const [dueReviews, weakSkills, skillMemories] = await Promise.all([
      getDueReviews(supabase, playerId, 10),
      getWeakSkills(supabase, playerId),
      getPlayerSkillMemories(supabase, playerId),
    ]);

    const skillMemoryMap = new Map(skillMemories.map(m => [m.skillCategory, m]));

    // 1. Add recommendations for due reviews
    for (const review of dueReviews) {
      const matchingGames = availableGames.filter(g => g.skillCategory === review.skillCategory);
      if (matchingGames.length === 0) continue;

      // Pick appropriate difficulty based on performance
      const targetDifficulty = review.avgScore >= 70 ? 'medium' : 'easy';
      const game =
        matchingGames.find(g => g.difficulty === targetDifficulty) || matchingGames[0];

      recommendations.push({
        gameId: game.id,
        gameTitle: game.title,
        skillCategory: review.skillCategory,
        difficulty: game.difficulty,
        recommendationType: review.daysOverdue > 3 ? 'overdue' : 'due_review',
        recommendationReason: formatReviewReason(review),
        priority: review.priorityScore,
        optimalReviewDate: null,
        urgencyLevel: review.reviewUrgency,
        predictedScoreRange: predictScoreRange(review.avgScore, review.memoryStrength),
      });
    }

    // 2. Add recommendations for weak skills not already in due reviews
    const dueSkills = new Set(dueReviews.map(r => r.skillCategory));
    for (const weak of weakSkills) {
      if (dueSkills.has(weak.skillCategory)) continue;

      const matchingGames = availableGames.filter(g => g.skillCategory === weak.skillCategory);
      if (matchingGames.length === 0) continue;

      // For weak skills, recommend easier games
      const game = matchingGames.find(g => g.difficulty === 'easy') || matchingGames[0];

      recommendations.push({
        gameId: game.id,
        gameTitle: game.title,
        skillCategory: weak.skillCategory,
        difficulty: game.difficulty,
        recommendationType: 'weak_skill',
        recommendationReason: formatWeakSkillReason(weak),
        priority: calculateWeakSkillPriority(weak),
        optimalReviewDate: null,
        urgencyLevel: weak.weaknessLevel === 'critical' ? 'critical' : 'high',
        predictedScoreRange: predictScoreRange(weak.avgScore, 0.5),
      });
    }

    // 3. Add reinforcement for recently improved skills
    for (const memory of skillMemories) {
      if (
        memory.improvementTrend === 'improving' &&
        memory.skillStatus !== 'mastered' &&
        !recommendations.some(r => r.skillCategory === memory.skillCategory)
      ) {
        const matchingGames = availableGames.filter(g => g.skillCategory === memory.skillCategory);
        if (matchingGames.length === 0) continue;

        // For improving skills, try slightly harder games
        const targetDifficulty = memory.avgScore >= 75 ? 'hard' : 'medium';
        const game =
          matchingGames.find(g => g.difficulty === targetDifficulty) || matchingGames[0];

        recommendations.push({
          gameId: game.id,
          gameTitle: game.title,
          skillCategory: memory.skillCategory,
          difficulty: game.difficulty,
          recommendationType: 'reinforcement',
          recommendationReason: `You're improving in ${getSkillName(memory.skillCategory)}! Keep the momentum going.`,
          priority: 30,
          optimalReviewDate: memory.nextReviewDate,
          urgencyLevel: 'low',
          predictedScoreRange: predictScoreRange(memory.avgScore, memory.memoryStrength),
        });
      }
    }

    // Sort by priority and limit
    recommendations.sort((a, b) => b.priority - a.priority);
    return recommendations.slice(0, SR_CONFIG.maxRecommendations);
  } catch (err) {
    console.warn('Failed to generate recommendations:', err);
    return [];
  }
};

/**
 * Get spaced repetition summary for a player
 */
export const getSpacedRepetitionSummary = async (
  supabase: SupabaseClient,
  playerId: string,
  availableGames: Game[]
): Promise<SpacedRepetitionSummary> => {
  try {
    const [skillMemories, recommendations] = await Promise.all([
      getPlayerSkillMemories(supabase, playerId),
      generateRecommendations(supabase, playerId, availableGames),
    ]);

    const totalSkillsTracked = skillMemories.length;
    const skillsDueForReview = skillMemories.filter(m => m.isDueForReview).length;
    const weakSkillsCount = skillMemories.filter(m => m.needsAttention).length;
    const masteredSkillsCount = skillMemories.filter(m => m.skillStatus === 'mastered').length;

    const avgMemoryStrength =
      totalSkillsTracked > 0
        ? skillMemories.reduce((sum, m) => sum + m.memoryStrength, 0) / totalSkillsTracked
        : 0;

    // Find next review date
    const upcomingReviews = skillMemories
      .filter(m => m.nextReviewDate && !m.isDueForReview)
      .sort((a, b) => (a.nextReviewDate?.getTime() || 0) - (b.nextReviewDate?.getTime() || 0));

    let nextReviewIn: number | null = null;
    if (upcomingReviews.length > 0 && upcomingReviews[0].nextReviewDate) {
      nextReviewIn = Math.max(
        0,
        (upcomingReviews[0].nextReviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      totalSkillsTracked,
      skillsDueForReview,
      weakSkillsCount,
      masteredSkillsCount,
      averageMemoryStrength: avgMemoryStrength,
      nextReviewIn,
      recommendations,
    };
  } catch (err) {
    console.warn('Failed to get spaced repetition summary:', err);
    return {
      totalSkillsTracked: 0,
      skillsDueForReview: 0,
      weakSkillsCount: 0,
      masteredSkillsCount: 0,
      averageMemoryStrength: 0,
      nextReviewIn: null,
      recommendations: [],
    };
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get skill display name
 */
export const getSkillName = (skillCategory: SkillCategory | string): string => {
  return SKILL_NAMES[skillCategory] || skillCategory;
};

/**
 * Format review recommendation reason
 */
const formatReviewReason = (review: DueReview): string => {
  const skillName = getSkillName(review.skillCategory);

  if (review.daysOverdue > 7) {
    return `${skillName} is significantly overdue for review (${Math.round(review.daysOverdue)} days). Your memory may have weakened.`;
  }
  if (review.daysOverdue > 0) {
    return `${skillName} is due for review. Practice now to maintain your skills.`;
  }
  if (review.weaknessLevel === 'critical') {
    return `${skillName} needs immediate attention. Your average score is only ${Math.round(review.avgScore)}%.`;
  }
  return `Time to practice ${skillName} to reinforce your learning.`;
};

/**
 * Format weak skill recommendation reason
 */
const formatWeakSkillReason = (weak: WeakSkill): string => {
  const skillName = getSkillName(weak.skillCategory);

  switch (weak.weaknessLevel) {
    case 'critical':
      return `${skillName} is a critical weakness (avg: ${Math.round(weak.avgScore)}%). Start with fundamentals.`;
    case 'significant':
      return `${skillName} needs significant work (avg: ${Math.round(weak.avgScore)}%). Focus on core concepts.`;
    case 'moderate':
      return `${skillName} could use some practice (avg: ${Math.round(weak.avgScore)}%). A few more attempts will help.`;
    case 'slight':
      return `${skillName} is almost there (avg: ${Math.round(weak.avgScore)}%). Just a bit more practice needed.`;
    default:
      return `Practice ${skillName} to improve your skills.`;
  }
};

/**
 * Calculate priority for weak skills
 */
const calculateWeakSkillPriority = (weak: WeakSkill): number => {
  switch (weak.weaknessLevel) {
    case 'critical':
      return 90;
    case 'significant':
      return 70;
    case 'moderate':
      return 50;
    case 'slight':
      return 30;
    default:
      return 20;
  }
};

/**
 * Predict score range based on history and memory strength
 */
const predictScoreRange = (avgScore: number, memoryStrength: number): [number, number] => {
  // Wider range with lower memory strength
  const variance = 15 * (1 - memoryStrength * 0.5);
  const expectedScore = avgScore * (0.8 + memoryStrength * 0.2);

  return [
    Math.max(0, Math.round(expectedScore - variance)),
    Math.min(100, Math.round(expectedScore + variance)),
  ];
};

/**
 * Format spaced repetition feedback for display
 */
export const formatSpacedRepetitionFeedback = (
  update: SkillMemoryUpdate,
  skillCategory: SkillCategory
): string => {
  const skillName = getSkillName(skillCategory);
  const parts: string[] = [];

  // Status-based message
  switch (update.skillStatus) {
    case 'mastered':
      parts.push(
        `<p style="color:#22c55e;">🎯 <strong>Skill Mastered!</strong> You've demonstrated consistent excellence in ${skillName}.</p>`
      );
      break;
    case 'weak':
      parts.push(
        `<p style="color:#f97316;">💪 <strong>Keep Practicing!</strong> ${skillName} needs more attention. ${getWeaknessAdvice(update.weaknessLevel)}</p>`
      );
      break;
    case 'learning':
      parts.push(
        `<p style="color:#3b82f6;">📚 <strong>Learning Progress</strong>: You're building ${skillName} skills. Keep at it!</p>`
      );
      break;
    case 'reviewing':
      parts.push(
        `<p style="color:#8b5cf6;">🔄 <strong>Review Complete</strong>: Nice work reinforcing your ${skillName} knowledge.</p>`
      );
      break;
  }

  // Next review info
  if (update.nextReviewDate) {
    const daysUntilReview = Math.ceil(
      (update.nextReviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilReview <= 1) {
      parts.push(`<p style="color:#94a3b8;font-size:0.9em;">📅 Next review: Tomorrow</p>`);
    } else if (daysUntilReview <= 7) {
      parts.push(
        `<p style="color:#94a3b8;font-size:0.9em;">📅 Next review: In ${daysUntilReview} days</p>`
      );
    }
  }

  if (parts.length === 0) return '';

  return `<div style="background:#1e293b;border-radius:8px;padding:12px;margin:10px 0;">${parts.join('')}</div>`;
};

/**
 * Get advice based on weakness level
 */
const getWeaknessAdvice = (weaknessLevel: WeaknessLevel): string => {
  switch (weaknessLevel) {
    case 'critical':
      return 'Consider starting with easier games to build confidence.';
    case 'significant':
      return 'Focus on understanding the core concepts first.';
    case 'moderate':
      return 'Regular practice will help you improve.';
    case 'slight':
      return 'You\'re close to mastery - keep going!';
    default:
      return 'Practice makes perfect!';
  }
};
