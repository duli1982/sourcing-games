/**
 * Spaced Repetition Enhancements
 *
 * Features:
 * - XP bonus for practicing weak skills
 * - Review mode with reduced scoring pressure
 * - Retention rate tracking over time
 *
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { SkillCategory, Difficulty } from '../../types.js';
import {
  SkillMemory,
  WeaknessLevel,
  SkillStatus,
  getSkillName,
  getPlayerSkillMemories,
  SR_CONFIG,
} from './spacedRepetition.js';

// ============================================================================
// TYPES
// ============================================================================

export interface XpBonusResult {
  baseScore: number;
  bonusXp: number;
  totalXp: number;
  bonusBreakdown: XpBonusBreakdown[];
  multiplier: number;
  reason: string;
}

export interface XpBonusBreakdown {
  type: 'weak_skill' | 'overdue_review' | 'streak' | 'improvement' | 'challenge' | 'consistency';
  amount: number;
  description: string;
}

export interface ReviewModeConfig {
  /** Whether review mode is enabled */
  enabled: boolean;
  /** Score weight for total score calculation (0.0-1.0) */
  scoreWeight: number;
  /** Minimum score floor in review mode (prevents discouragement) */
  minimumScoreFloor: number;
  /** Whether to show encouraging messages */
  showEncouragement: boolean;
  /** Whether this is a "safe practice" session */
  safePractice: boolean;
}

export interface ReviewModeResult {
  originalScore: number;
  adjustedScore: number;
  xpContribution: number;
  isReviewMode: boolean;
  encouragement: string;
  learningFocus: string[];
}

export interface RetentionDataPoint {
  date: Date;
  skillCategory: SkillCategory;
  score: number;
  memoryStrength: number;
  daysSinceLastPractice: number;
  retained: boolean; // Score >= 70% of best score
}

export interface RetentionStats {
  skillCategory: SkillCategory;
  totalDataPoints: number;
  averageRetention: number;
  retentionRate: number; // % of attempts where skill was retained
  decayRate: number; // How fast skill decays (higher = faster decay)
  optimalReviewInterval: number; // Days for optimal retention
  retentionCurve: RetentionCurvePoint[];
  trend: 'improving' | 'stable' | 'declining';
  prediction: RetentionPrediction;
}

export interface RetentionCurvePoint {
  daysSincePractice: number;
  predictedRetention: number;
  confidence: number;
}

export interface RetentionPrediction {
  daysUntil80Percent: number; // Days until 80% retention
  daysUntil60Percent: number; // Days until 60% retention
  recommendedReviewIn: number; // Optimal days until next review
}

export interface PlayerRetentionProfile {
  playerId: string;
  overallRetentionRate: number;
  skillRetention: Map<SkillCategory, RetentionStats>;
  learningVelocity: number; // How quickly player learns new skills
  forgettingCurve: 'fast' | 'average' | 'slow';
  optimalSessionLength: number; // Recommended games per session
  bestPracticeTime: string | null; // Time of day with best performance
  lastUpdated: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const XP_BONUS_CONFIG = {
  // Weakness-based bonuses
  weakSkillBonus: {
    critical: 25,    // +25 XP for practicing critical weakness
    significant: 18, // +18 XP for significant weakness
    moderate: 12,    // +12 XP for moderate weakness
    slight: 6,       // +6 XP for slight weakness
  },

  // Overdue review bonuses
  overdueBonus: {
    mild: 5,        // 1-3 days overdue: +5 XP
    moderate: 10,   // 4-7 days overdue: +10 XP
    significant: 15, // 8-14 days overdue: +15 XP
    critical: 20,   // 15+ days overdue: +20 XP
  },

  // Streak bonuses (consecutive days practicing)
  streakBonus: {
    day3: 5,    // 3-day streak: +5 XP
    day5: 10,   // 5-day streak: +10 XP
    day7: 15,   // 7-day streak: +15 XP
    day14: 25,  // 14-day streak: +25 XP
    day30: 50,  // 30-day streak: +50 XP
  },

  // Improvement bonuses
  improvementBonus: {
    small: 5,    // +5-9 points from last attempt: +5 XP
    medium: 10,  // +10-19 points: +10 XP
    large: 20,   // +20+ points: +20 XP
  },

  // Challenge bonuses (attempting harder games)
  challengeBonus: {
    medium: 5,  // Medium difficulty: +5 XP
    hard: 10,   // Hard difficulty: +10 XP
    expert: 15, // Expert difficulty: +15 XP
  },

  // Consistency bonus (regular practice pattern)
  consistencyMultiplier: 1.1, // 10% bonus for consistent practice

  // Maximum total bonus cap
  maxBonusXp: 50,
};

export const REVIEW_MODE_CONFIG: ReviewModeConfig = {
  enabled: false,
  scoreWeight: 0.5, // 50% weight toward total score
  minimumScoreFloor: 40, // Minimum 40 points in review mode
  showEncouragement: true,
  safePractice: true,
};

export const RETENTION_CONFIG = {
  // Retention thresholds
  retainedThreshold: 0.7, // 70% of best score = retained
  minDataPoints: 3, // Minimum data points for stats

  // Decay model parameters
  baseDecayRate: 0.15,
  minDecayRate: 0.05,
  maxDecayRate: 0.4,

  // Prediction intervals
  predictionDays: [1, 3, 7, 14, 30, 60, 90],

  // Optimal review calculation
  targetRetention: 0.85, // Target 85% retention
};

// ============================================================================
// XP BONUS SYSTEM
// ============================================================================

/**
 * Calculate XP bonus for practicing weak skills
 */
export const calculateWeakSkillBonus = (
  weaknessLevel: WeaknessLevel
): XpBonusBreakdown | null => {
  if (!weaknessLevel) return null;

  const bonus = XP_BONUS_CONFIG.weakSkillBonus[weaknessLevel];
  return {
    type: 'weak_skill',
    amount: bonus,
    description: `+${bonus} XP for practicing ${weaknessLevel} weakness`,
  };
};

/**
 * Calculate XP bonus for overdue reviews
 */
export const calculateOverdueBonus = (
  daysOverdue: number
): XpBonusBreakdown | null => {
  if (daysOverdue <= 0) return null;

  let bonus: number;
  let category: string;

  if (daysOverdue >= 15) {
    bonus = XP_BONUS_CONFIG.overdueBonus.critical;
    category = 'critical';
  } else if (daysOverdue >= 8) {
    bonus = XP_BONUS_CONFIG.overdueBonus.significant;
    category = 'significant';
  } else if (daysOverdue >= 4) {
    bonus = XP_BONUS_CONFIG.overdueBonus.moderate;
    category = 'moderate';
  } else {
    bonus = XP_BONUS_CONFIG.overdueBonus.mild;
    category = 'mild';
  }

  return {
    type: 'overdue_review',
    amount: bonus,
    description: `+${bonus} XP for ${category} overdue review (${Math.round(daysOverdue)} days)`,
  };
};

/**
 * Calculate XP bonus for practice streak
 */
export const calculateStreakBonus = (
  consecutiveDays: number
): XpBonusBreakdown | null => {
  if (consecutiveDays < 3) return null;

  let bonus: number;

  if (consecutiveDays >= 30) {
    bonus = XP_BONUS_CONFIG.streakBonus.day30;
  } else if (consecutiveDays >= 14) {
    bonus = XP_BONUS_CONFIG.streakBonus.day14;
  } else if (consecutiveDays >= 7) {
    bonus = XP_BONUS_CONFIG.streakBonus.day7;
  } else if (consecutiveDays >= 5) {
    bonus = XP_BONUS_CONFIG.streakBonus.day5;
  } else {
    bonus = XP_BONUS_CONFIG.streakBonus.day3;
  }

  return {
    type: 'streak',
    amount: bonus,
    description: `+${bonus} XP for ${consecutiveDays}-day practice streak`,
  };
};

/**
 * Calculate XP bonus for score improvement
 */
export const calculateImprovementBonus = (
  currentScore: number,
  previousScore: number | null
): XpBonusBreakdown | null => {
  if (previousScore === null) return null;

  const improvement = currentScore - previousScore;
  if (improvement < 5) return null;

  let bonus: number;
  let category: string;

  if (improvement >= 20) {
    bonus = XP_BONUS_CONFIG.improvementBonus.large;
    category = 'large';
  } else if (improvement >= 10) {
    bonus = XP_BONUS_CONFIG.improvementBonus.medium;
    category = 'medium';
  } else {
    bonus = XP_BONUS_CONFIG.improvementBonus.small;
    category = 'small';
  }

  return {
    type: 'improvement',
    amount: bonus,
    description: `+${bonus} XP for ${category} improvement (+${improvement} points)`,
  };
};

/**
 * Calculate XP bonus for attempting challenging games
 */
export const calculateChallengeBonus = (
  difficulty: Difficulty,
  avgScore: number
): XpBonusBreakdown | null => {
  // Only give bonus if player is stretching beyond comfort zone
  // (attempting harder difficulty than their average suggests)
  const isStretching = (
    (difficulty === 'hard' && avgScore < 75) ||
    (difficulty === 'medium' && avgScore < 60) ||
    (difficulty === 'expert' && avgScore < 85)
  );

  if (!isStretching) return null;

  let bonus: number;

  switch (difficulty) {
    case 'expert':
      bonus = XP_BONUS_CONFIG.challengeBonus.expert;
      break;
    case 'hard':
      bonus = XP_BONUS_CONFIG.challengeBonus.hard;
      break;
    case 'medium':
      bonus = XP_BONUS_CONFIG.challengeBonus.medium;
      break;
    default:
      return null;
  }

  return {
    type: 'challenge',
    amount: bonus,
    description: `+${bonus} XP for attempting ${difficulty} challenge`,
  };
};

/**
 * Calculate comprehensive XP bonus for an attempt
 */
export const calculateXpBonus = async (
  supabase: SupabaseClient,
  playerId: string,
  skillCategory: SkillCategory,
  gameId: string,
  score: number,
  difficulty: Difficulty,
  previousScore: number | null
): Promise<XpBonusResult> => {
  const bonuses: XpBonusBreakdown[] = [];
  let multiplier = 1.0;

  try {
    // Get player's skill memory for this category
    const skillMemories = await getPlayerSkillMemories(supabase, playerId);
    const skillMemory = skillMemories.find(m => m.skillCategory === skillCategory);

    // 1. Weak skill bonus
    if (skillMemory?.weaknessLevel) {
      const weakBonus = calculateWeakSkillBonus(skillMemory.weaknessLevel);
      if (weakBonus) bonuses.push(weakBonus);
    }

    // 2. Overdue review bonus
    if (skillMemory?.daysOverdue && skillMemory.daysOverdue > 0) {
      const overdueBonus = calculateOverdueBonus(skillMemory.daysOverdue);
      if (overdueBonus) bonuses.push(overdueBonus);
    }

    // 3. Practice streak bonus
    const streakDays = await getPlayerStreak(supabase, playerId);
    const streakBonus = calculateStreakBonus(streakDays);
    if (streakBonus) bonuses.push(streakBonus);

    // 4. Improvement bonus
    const lastScore = previousScore ?? skillMemory?.currentScore ?? null;
    const improvementBonus = calculateImprovementBonus(score, lastScore);
    if (improvementBonus) bonuses.push(improvementBonus);

    // 5. Challenge bonus
    const avgScore = skillMemory?.avgScore ?? 50;
    const challengeBonus = calculateChallengeBonus(difficulty, avgScore);
    if (challengeBonus) bonuses.push(challengeBonus);

    // 6. Consistency multiplier
    const isConsistent = await checkPracticeConsistency(supabase, playerId);
    if (isConsistent) {
      multiplier = XP_BONUS_CONFIG.consistencyMultiplier;
      bonuses.push({
        type: 'consistency',
        amount: 0, // Multiplier, not flat bonus
        description: `${Math.round((multiplier - 1) * 100)}% bonus for consistent practice`,
      });
    }

    // Calculate total bonus
    const rawBonus = bonuses.reduce((sum, b) => sum + b.amount, 0);
    const cappedBonus = Math.min(rawBonus, XP_BONUS_CONFIG.maxBonusXp);
    const totalBonus = Math.round(cappedBonus * multiplier);
    const totalXp = score + totalBonus;

    // Build reason string
    const reasonParts = bonuses
      .filter(b => b.amount > 0)
      .map(b => b.description);
    const reason = reasonParts.length > 0
      ? reasonParts.join('; ')
      : 'No bonus applied';

    return {
      baseScore: score,
      bonusXp: totalBonus,
      totalXp,
      bonusBreakdown: bonuses,
      multiplier,
      reason,
    };
  } catch (err) {
    console.warn('XP bonus calculation failed:', err);
    return {
      baseScore: score,
      bonusXp: 0,
      totalXp: score,
      bonusBreakdown: [],
      multiplier: 1.0,
      reason: 'Bonus calculation unavailable',
    };
  }
};

/**
 * Get player's current practice streak (consecutive days)
 */
export const getPlayerStreak = async (
  supabase: SupabaseClient,
  playerId: string
): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('progress')
      .eq('id', playerId)
      .single();

    if (error || !data?.progress?.attempts) return 0;

    const attempts = data.progress.attempts as Array<{ ts: string }>;
    if (attempts.length === 0) return 0;

    // Get unique days with attempts
    const attemptDays = new Set<string>();
    attempts.forEach(a => {
      if (a.ts) {
        const day = new Date(a.ts).toISOString().split('T')[0];
        attemptDays.add(day);
      }
    });

    // Count consecutive days from today
    const today = new Date();
    let streak = 0;
    const currentDate = new Date(today);

    while (true) {
      const dayStr = currentDate.toISOString().split('T')[0];
      if (attemptDays.has(dayStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (streak === 0) {
        // Allow starting streak from yesterday if no attempt today yet
        currentDate.setDate(currentDate.getDate() - 1);
        const yesterdayStr = currentDate.toISOString().split('T')[0];
        if (attemptDays.has(yesterdayStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      } else {
        break;
      }

      // Safety limit
      if (streak > 365) break;
    }

    return streak;
  } catch (err) {
    console.warn('Streak calculation failed:', err);
    return 0;
  }
};

/**
 * Check if player has consistent practice pattern
 * (At least 3 sessions in the past 7 days with at least 1 day gap)
 */
export const checkPracticeConsistency = async (
  supabase: SupabaseClient,
  playerId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('progress')
      .eq('id', playerId)
      .single();

    if (error || !data?.progress?.attempts) return false;

    const attempts = data.progress.attempts as Array<{ ts: string }>;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Get unique days with attempts in last 7 days
    const recentDays = new Set<string>();
    attempts.forEach(a => {
      if (a.ts && new Date(a.ts).getTime() > sevenDaysAgo) {
        const day = new Date(a.ts).toISOString().split('T')[0];
        recentDays.add(day);
      }
    });

    // Consistent if 3+ unique days in last week
    return recentDays.size >= 3;
  } catch (err) {
    console.warn('Consistency check failed:', err);
    return false;
  }
};

// ============================================================================
// REVIEW MODE
// ============================================================================

/**
 * Check if review mode should be enabled for this attempt
 */
export const shouldEnableReviewMode = (
  skillMemory: SkillMemory | null,
  isExplicitReviewMode: boolean
): boolean => {
  if (isExplicitReviewMode) return true;

  // Auto-enable review mode for:
  // 1. Critical or significant weakness
  // 2. Very overdue reviews (7+ days)
  // 3. New skills with low confidence

  if (!skillMemory) return false;

  if (skillMemory.weaknessLevel === 'critical' || skillMemory.weaknessLevel === 'significant') {
    return true;
  }

  if (skillMemory.daysOverdue >= 7) {
    return true;
  }

  if (skillMemory.skillStatus === 'new' && skillMemory.totalAttempts <= 1) {
    return true;
  }

  return false;
};

/**
 * Apply review mode adjustments to score
 */
export const applyReviewMode = (
  score: number,
  skillMemory: SkillMemory | null,
  config: ReviewModeConfig = REVIEW_MODE_CONFIG
): ReviewModeResult => {
  if (!config.enabled) {
    return {
      originalScore: score,
      adjustedScore: score,
      xpContribution: score,
      isReviewMode: false,
      encouragement: '',
      learningFocus: [],
    };
  }

  // Apply score floor for encouragement
  const flooredScore = Math.max(score, config.minimumScoreFloor);

  // Calculate XP contribution (reduced weight)
  const xpContribution = Math.round(flooredScore * config.scoreWeight);

  // Generate encouragement message
  const encouragement = generateReviewEncouragement(score, skillMemory);

  // Identify learning focus areas
  const learningFocus = identifyLearningFocus(skillMemory);

  return {
    originalScore: score,
    adjustedScore: flooredScore,
    xpContribution,
    isReviewMode: true,
    encouragement,
    learningFocus,
  };
};

/**
 * Generate encouraging message for review mode
 */
const generateReviewEncouragement = (
  score: number,
  skillMemory: SkillMemory | null
): string => {
  const skillName = skillMemory ? getSkillName(skillMemory.skillCategory) : 'this skill';

  if (score >= 80) {
    return `Excellent review session! You're maintaining strong ${skillName} skills.`;
  } else if (score >= 60) {
    return `Good practice! You're reinforcing your ${skillName} knowledge.`;
  } else if (score >= 40) {
    return `Nice effort on ${skillName}! Review mode is helping you rebuild this skill without pressure.`;
  } else {
    return `Keep practicing ${skillName}! This review session is helping identify areas to focus on.`;
  }
};

/**
 * Identify specific areas to focus on based on skill memory
 */
const identifyLearningFocus = (skillMemory: SkillMemory | null): string[] => {
  const focus: string[] = [];

  if (!skillMemory) {
    focus.push('Build foundational knowledge');
    return focus;
  }

  if (skillMemory.weaknessLevel === 'critical') {
    focus.push('Master the basics first');
    focus.push('Review example solutions');
  } else if (skillMemory.weaknessLevel === 'significant') {
    focus.push('Practice core concepts');
    focus.push('Try easier games to build confidence');
  } else if (skillMemory.weaknessLevel === 'moderate') {
    focus.push('Work on consistency');
    focus.push('Challenge yourself with variations');
  }

  if (skillMemory.improvementTrend === 'declining') {
    focus.push('Revisit fundamentals');
  }

  if (skillMemory.daysOverdue > 7) {
    focus.push('Regular practice to prevent forgetting');
  }

  return focus.slice(0, 3); // Max 3 focus areas
};

// ============================================================================
// RETENTION TRACKING
// ============================================================================

/**
 * Record retention data point after an attempt
 */
export const recordRetentionDataPoint = async (
  supabase: SupabaseClient,
  playerId: string,
  skillCategory: SkillCategory,
  score: number,
  bestScore: number,
  lastAttemptAt: Date | null
): Promise<void> => {
  try {
    const daysSinceLastPractice = lastAttemptAt
      ? (Date.now() - lastAttemptAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    const retained = score >= bestScore * RETENTION_CONFIG.retainedThreshold;

    const memoryStrength = calculateRetentionMemoryStrength(
      score,
      bestScore,
      daysSinceLastPractice
    );

    const { error } = await supabase.from('retention_tracking').insert({
      player_id: playerId,
      skill_category: skillCategory,
      score,
      best_score: bestScore,
      memory_strength: memoryStrength,
      days_since_last_practice: Math.round(daysSinceLastPractice * 10) / 10,
      retained,
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Failed to record retention data:', error);
    }
  } catch (err) {
    console.warn('Retention tracking exception:', err);
  }
};

/**
 * Calculate memory strength for retention tracking
 */
const calculateRetentionMemoryStrength = (
  score: number,
  bestScore: number,
  daysSincePractice: number
): number => {
  // Base memory from score relative to best
  const scoreRatio = bestScore > 0 ? score / bestScore : 0.5;

  // Time decay factor
  const decayFactor = Math.exp(-RETENTION_CONFIG.baseDecayRate * daysSincePractice / 7);

  // Combine for overall memory strength
  return Math.max(0, Math.min(1, scoreRatio * 0.7 + decayFactor * 0.3));
};

/**
 * Get retention statistics for a skill category
 */
export const getRetentionStats = async (
  supabase: SupabaseClient,
  playerId: string,
  skillCategory: SkillCategory
): Promise<RetentionStats | null> => {
  try {
    const { data, error } = await supabase
      .from('retention_tracking')
      .select('*')
      .eq('player_id', playerId)
      .eq('skill_category', skillCategory)
      .order('recorded_at', { ascending: true });

    if (error || !data || data.length < RETENTION_CONFIG.minDataPoints) {
      return null;
    }

    const dataPoints: RetentionDataPoint[] = data.map((row: any) => ({
      date: new Date(row.recorded_at),
      skillCategory: row.skill_category,
      score: row.score,
      memoryStrength: row.memory_strength,
      daysSinceLastPractice: row.days_since_last_practice,
      retained: row.retained,
    }));

    return calculateRetentionStats(skillCategory, dataPoints);
  } catch (err) {
    console.warn('Failed to get retention stats:', err);
    return null;
  }
};

/**
 * Calculate retention statistics from data points
 */
const calculateRetentionStats = (
  skillCategory: SkillCategory,
  dataPoints: RetentionDataPoint[]
): RetentionStats => {
  const totalDataPoints = dataPoints.length;

  // Average retention (memory strength)
  const avgRetention = dataPoints.reduce((sum, dp) => sum + dp.memoryStrength, 0) / totalDataPoints;

  // Retention rate (% of attempts where skill was retained)
  const retainedCount = dataPoints.filter(dp => dp.retained).length;
  const retentionRate = retainedCount / totalDataPoints;

  // Calculate decay rate from data
  const decayRate = calculateDecayRateFromData(dataPoints);

  // Calculate optimal review interval
  const optimalReviewInterval = calculateOptimalReviewInterval(decayRate);

  // Generate retention curve
  const retentionCurve = generateRetentionCurve(avgRetention, decayRate);

  // Determine trend
  const trend = calculateRetentionTrend(dataPoints);

  // Make predictions
  const prediction = makeRetentionPrediction(avgRetention, decayRate);

  return {
    skillCategory,
    totalDataPoints,
    averageRetention: Math.round(avgRetention * 100) / 100,
    retentionRate: Math.round(retentionRate * 100) / 100,
    decayRate: Math.round(decayRate * 1000) / 1000,
    optimalReviewInterval: Math.round(optimalReviewInterval),
    retentionCurve,
    trend,
    prediction,
  };
};

/**
 * Calculate decay rate from retention data points
 */
const calculateDecayRateFromData = (dataPoints: RetentionDataPoint[]): number => {
  // Use linear regression on log(retention) vs time
  // to estimate decay rate

  const validPoints = dataPoints.filter(dp =>
    dp.daysSinceLastPractice > 0 && dp.memoryStrength > 0
  );

  if (validPoints.length < 2) {
    return RETENTION_CONFIG.baseDecayRate;
  }

  // Calculate average decay per day
  let totalDecay = 0;
  let count = 0;

  for (const point of validPoints) {
    // R = e^(-k*t) => k = -ln(R)/t
    const k = -Math.log(point.memoryStrength) / point.daysSinceLastPractice;
    if (isFinite(k) && k > 0) {
      totalDecay += k;
      count++;
    }
  }

  if (count === 0) return RETENTION_CONFIG.baseDecayRate;

  const avgDecay = totalDecay / count;

  // Clamp to reasonable range
  return Math.max(
    RETENTION_CONFIG.minDecayRate,
    Math.min(RETENTION_CONFIG.maxDecayRate, avgDecay)
  );
};

/**
 * Calculate optimal review interval based on decay rate
 */
const calculateOptimalReviewInterval = (decayRate: number): number => {
  // Find t where retention = target retention
  // R = e^(-k*t) => t = -ln(R)/k
  const targetRetention = RETENTION_CONFIG.targetRetention;
  const interval = -Math.log(targetRetention) / decayRate;

  // Clamp to reasonable range (1-30 days)
  return Math.max(1, Math.min(30, interval));
};

/**
 * Generate retention curve predictions
 */
const generateRetentionCurve = (
  currentRetention: number,
  decayRate: number
): RetentionCurvePoint[] => {
  return RETENTION_CONFIG.predictionDays.map(days => {
    // R(t) = R0 * e^(-k*t)
    const predictedRetention = currentRetention * Math.exp(-decayRate * days);

    // Confidence decreases with time
    const confidence = Math.max(0.3, 1 - days / 90);

    return {
      daysSincePractice: days,
      predictedRetention: Math.round(predictedRetention * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    };
  });
};

/**
 * Calculate retention trend (improving, stable, declining)
 */
const calculateRetentionTrend = (
  dataPoints: RetentionDataPoint[]
): 'improving' | 'stable' | 'declining' => {
  if (dataPoints.length < 3) return 'stable';

  // Compare first half to second half
  const midpoint = Math.floor(dataPoints.length / 2);
  const firstHalf = dataPoints.slice(0, midpoint);
  const secondHalf = dataPoints.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, dp) => sum + dp.memoryStrength, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, dp) => sum + dp.memoryStrength, 0) / secondHalf.length;

  const change = secondAvg - firstAvg;

  if (change > 0.05) return 'improving';
  if (change < -0.05) return 'declining';
  return 'stable';
};

/**
 * Make retention predictions
 */
const makeRetentionPrediction = (
  currentRetention: number,
  decayRate: number
): RetentionPrediction => {
  // Time to reach 80% retention: t = -ln(0.8/R0) / k
  const daysUntil80 = currentRetention > 0.8
    ? -Math.log(0.8 / currentRetention) / decayRate
    : 0;

  // Time to reach 60% retention
  const daysUntil60 = currentRetention > 0.6
    ? -Math.log(0.6 / currentRetention) / decayRate
    : 0;

  // Recommended review (before dropping below 85%)
  const recommendedReview = currentRetention > 0.85
    ? -Math.log(0.85 / currentRetention) / decayRate
    : 0;

  return {
    daysUntil80Percent: Math.max(0, Math.round(daysUntil80)),
    daysUntil60Percent: Math.max(0, Math.round(daysUntil60)),
    recommendedReviewIn: Math.max(1, Math.round(recommendedReview)),
  };
};

/**
 * Get comprehensive retention profile for a player
 */
export const getPlayerRetentionProfile = async (
  supabase: SupabaseClient,
  playerId: string
): Promise<PlayerRetentionProfile | null> => {
  try {
    const { data: retentionData, error } = await supabase
      .from('retention_tracking')
      .select('*')
      .eq('player_id', playerId)
      .order('recorded_at', { ascending: true });

    if (error || !retentionData || retentionData.length === 0) {
      return null;
    }

    // Group by skill category
    const bySkill = new Map<SkillCategory, RetentionDataPoint[]>();
    retentionData.forEach((row: any) => {
      const skill = row.skill_category as SkillCategory;
      if (!bySkill.has(skill)) {
        bySkill.set(skill, []);
      }
      bySkill.get(skill)!.push({
        date: new Date(row.recorded_at),
        skillCategory: skill,
        score: row.score,
        memoryStrength: row.memory_strength,
        daysSinceLastPractice: row.days_since_last_practice,
        retained: row.retained,
      });
    });

    // Calculate stats for each skill
    const skillRetention = new Map<SkillCategory, RetentionStats>();
    let totalRetention = 0;
    let skillCount = 0;
    let totalDecayRate = 0;

    for (const [skill, points] of bySkill) {
      if (points.length >= RETENTION_CONFIG.minDataPoints) {
        const stats = calculateRetentionStats(skill, points);
        skillRetention.set(skill, stats);
        totalRetention += stats.averageRetention;
        totalDecayRate += stats.decayRate;
        skillCount++;
      }
    }

    // Calculate overall metrics
    const overallRetentionRate = skillCount > 0 ? totalRetention / skillCount : 0.5;
    const avgDecayRate = skillCount > 0 ? totalDecayRate / skillCount : RETENTION_CONFIG.baseDecayRate;

    // Classify forgetting curve
    let forgettingCurve: 'fast' | 'average' | 'slow';
    if (avgDecayRate < 0.1) {
      forgettingCurve = 'slow';
    } else if (avgDecayRate > 0.25) {
      forgettingCurve = 'fast';
    } else {
      forgettingCurve = 'average';
    }

    // Calculate learning velocity (how fast scores improve)
    const allScores = retentionData.map((r: any) => r.score);
    const firstScores = allScores.slice(0, Math.min(5, Math.floor(allScores.length / 2)));
    const lastScores = allScores.slice(-Math.min(5, Math.floor(allScores.length / 2)));
    const firstAvg = firstScores.reduce((a: number, b: number) => a + b, 0) / firstScores.length;
    const lastAvg = lastScores.reduce((a: number, b: number) => a + b, 0) / lastScores.length;
    const learningVelocity = (lastAvg - firstAvg) / allScores.length; // Points improvement per attempt

    return {
      playerId,
      overallRetentionRate: Math.round(overallRetentionRate * 100) / 100,
      skillRetention,
      learningVelocity: Math.round(learningVelocity * 100) / 100,
      forgettingCurve,
      optimalSessionLength: forgettingCurve === 'fast' ? 3 : forgettingCurve === 'slow' ? 5 : 4,
      bestPracticeTime: null, // Would need time analysis
      lastUpdated: new Date(),
    };
  } catch (err) {
    console.warn('Failed to get retention profile:', err);
    return null;
  }
};

// ============================================================================
// FEEDBACK FORMATTING
// ============================================================================

/**
 * Format XP bonus feedback for display
 */
export const formatXpBonusFeedback = (result: XpBonusResult): string => {
  if (result.bonusXp === 0) return '';

  const bonusItems = result.bonusBreakdown
    .filter(b => b.amount > 0)
    .map(b => `<li>${b.description}</li>`)
    .join('');

  return `
<div style="background:#1e1b4b;padding:12px;border-radius:8px;border:1px solid #8b5cf6;margin:10px 0;">
  <p><strong>🎁 XP Bonus Earned!</strong></p>
  <p style="font-size:1.1em;color:#a78bfa;">
    Base: ${result.baseScore} + Bonus: <strong>+${result.bonusXp}</strong> = <strong>${result.totalXp} total XP</strong>
  </p>
  <ul style="margin:8px 0;padding-left:20px;font-size:0.9em;color:#c4b5fd;">
    ${bonusItems}
  </ul>
  ${result.multiplier > 1 ? `<p style="color:#22c55e;font-size:0.85em;">✨ Consistency multiplier: ${Math.round((result.multiplier - 1) * 100)}% bonus applied!</p>` : ''}
</div>`;
};

/**
 * Format review mode feedback for display
 */
export const formatReviewModeFeedback = (result: ReviewModeResult): string => {
  if (!result.isReviewMode) return '';

  const focusItems = result.learningFocus
    .map(f => `<li>${f}</li>`)
    .join('');

  return `
<div style="background:#172554;padding:12px;border-radius:8px;border:1px solid #3b82f6;margin:10px 0;">
  <p><strong>📚 Review Mode Active</strong></p>
  <p style="color:#93c5fd;">${result.encouragement}</p>
  <p style="font-size:0.9em;color:#60a5fa;">
    Score: ${result.originalScore} → XP contribution: ${result.xpContribution} (${Math.round(REVIEW_MODE_CONFIG.scoreWeight * 100)}% weight)
  </p>
  ${focusItems ? `
  <p style="margin-top:8px;color:#94a3b8;font-size:0.85em;"><strong>Focus areas:</strong></p>
  <ul style="margin:4px 0;padding-left:20px;font-size:0.85em;color:#94a3b8;">
    ${focusItems}
  </ul>
  ` : ''}
  <p style="margin-top:8px;font-size:0.8em;color:#64748b;">💡 Review mode reduces scoring pressure to help you learn without stress.</p>
</div>`;
};

/**
 * Format retention stats feedback for display
 */
export const formatRetentionFeedback = (stats: RetentionStats | null): string => {
  if (!stats) return '';

  const skillName = getSkillName(stats.skillCategory);
  const trendIcon = stats.trend === 'improving' ? '📈' : stats.trend === 'declining' ? '📉' : '➡️';
  const trendColor = stats.trend === 'improving' ? '#22c55e' : stats.trend === 'declining' ? '#ef4444' : '#94a3b8';

  // Retention level indicator
  let retentionLevel: string;
  let retentionColor: string;
  if (stats.retentionRate >= 0.85) {
    retentionLevel = 'Excellent';
    retentionColor = '#22c55e';
  } else if (stats.retentionRate >= 0.7) {
    retentionLevel = 'Good';
    retentionColor = '#3b82f6';
  } else if (stats.retentionRate >= 0.5) {
    retentionLevel = 'Moderate';
    retentionColor = '#f59e0b';
  } else {
    retentionLevel = 'Needs Work';
    retentionColor = '#ef4444';
  }

  return `
<div style="background:#0f172a;padding:12px;border-radius:8px;border:1px solid #6366f1;margin:10px 0;">
  <p><strong>🧠 ${skillName} Retention</strong></p>
  <p style="margin:6px 0;">
    Retention: <strong style="color:${retentionColor};">${retentionLevel}</strong> (${Math.round(stats.retentionRate * 100)}%)
    <span style="color:${trendColor};margin-left:10px;">${trendIcon} ${stats.trend}</span>
  </p>
  <p style="font-size:0.9em;color:#94a3b8;">
    📊 Based on ${stats.totalDataPoints} practice sessions
  </p>
  <p style="font-size:0.85em;color:#64748b;">
    Optimal review: Every ${stats.optimalReviewInterval} days |
    Predicted retention drops to 80% in ${stats.prediction.daysUntil80Percent} days
  </p>
</div>`;
};

export default {
  calculateXpBonus,
  calculateWeakSkillBonus,
  calculateOverdueBonus,
  calculateStreakBonus,
  calculateImprovementBonus,
  calculateChallengeBonus,
  getPlayerStreak,
  checkPracticeConsistency,
  shouldEnableReviewMode,
  applyReviewMode,
  recordRetentionDataPoint,
  getRetentionStats,
  getPlayerRetentionProfile,
  formatXpBonusFeedback,
  formatReviewModeFeedback,
  formatRetentionFeedback,
  XP_BONUS_CONFIG,
  REVIEW_MODE_CONFIG,
  RETENTION_CONFIG,
};
