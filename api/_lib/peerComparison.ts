/**
 * Peer Comparison & Curve Mode Scoring
 *
 * Features:
 * - Game-specific percentile rankings ("You're in the top X%")
 * - Skill-category-wide percentiles across related games
 * - Optional "curve" mode for competitive scoring
 * - Historical trend tracking
 * - Peer performance insights
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Attempt, SkillCategory, Difficulty } from '../../types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface PeerStats {
  count: number;
  percentile: number;          // Your percentile (0-100, higher = better)
  topPercentage: number;       // "Top X%" (e.g., 15 = top 15%)
  rank: number;                // Your rank (1 = best)
  median: number;              // Median score
  mean: number;                // Average score
  stdDev: number;              // Standard deviation
  p10: number;                 // 10th percentile (bottom performers)
  p25: number;                 // 25th percentile
  p75: number;                 // 75th percentile
  p90: number;                 // 90th percentile (top performers)
  min: number;
  max: number;
}

export interface CategoryPeerStats extends PeerStats {
  skillCategory: SkillCategory;
  gamesIncluded: number;
  uniquePlayers: number;
}

export interface CurveModeResult {
  originalScore: number;
  curvedScore: number;
  adjustment: number;
  curveType: 'bell' | 'linear' | 'sqrt' | 'none';
  curveStrength: number;       // 0-1, how much curve was applied
  reason: string;
}

export interface PeerComparisonResult {
  gameStats: PeerStats | null;
  categoryStats: CategoryPeerStats | null;
  curveResult: CurveModeResult | null;
  insights: PeerInsight[];
  performanceLevel: 'exceptional' | 'above_average' | 'average' | 'below_average' | 'struggling';
}

export interface PeerInsight {
  type: 'achievement' | 'encouragement' | 'tip' | 'comparison';
  message: string;
  icon: string;
}

export interface PeerComparisonConfig {
  /** Minimum attempts needed for valid peer comparison */
  minPeerCount: number;
  /** Enable curve mode for competitive scoring */
  enableCurveMode: boolean;
  /** Curve strength (0-1, higher = more aggressive curve) */
  curveStrength: number;
  /** Curve type */
  curveType: 'bell' | 'linear' | 'sqrt' | 'none';
  /** Target median for bell curve */
  bellCurveTargetMedian: number;
  /** Enable skill-category-wide percentiles */
  enableCategoryPercentiles: boolean;
  /** Minimum games in category for category stats */
  minCategoryGames: number;
}

export const DEFAULT_PEER_CONFIG: PeerComparisonConfig = {
  minPeerCount: 5,
  enableCurveMode: false,
  curveStrength: 0.3,
  curveType: 'bell',
  bellCurveTargetMedian: 70,
  enableCategoryPercentiles: true,
  minCategoryGames: 3,
};

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

/**
 * Calculate percentile rank (what percentage of scores are below this score)
 */
const calculatePercentile = (scores: number[], value: number): number => {
  if (scores.length === 0) return 50;
  const sorted = [...scores].sort((a, b) => a - b);
  const belowCount = sorted.filter(s => s < value).length;
  const equalCount = sorted.filter(s => s === value).length;
  // Percentile = (below + 0.5 * equal) / total * 100
  return Math.round(((belowCount + 0.5 * equalCount) / sorted.length) * 100);
};

/**
 * Calculate "top X%" (e.g., if you're at 85th percentile, you're in top 15%)
 */
const calculateTopPercentage = (percentile: number): number => {
  return Math.max(1, 100 - percentile);
};

/**
 * Calculate rank position (1 = highest score)
 */
const calculateRank = (scores: number[], value: number): number => {
  const sorted = [...scores].sort((a, b) => b - a); // Descending
  const rank = sorted.findIndex(s => s <= value) + 1;
  return rank || sorted.length + 1;
};

/**
 * Calculate standard deviation
 */
const calculateStdDev = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / scores.length);
};

/**
 * Get value at specific percentile
 */
const getPercentileValue = (scores: number[], percentile: number): number => {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

/**
 * Calculate mean
 */
const calculateMean = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
};

// ============================================================================
// PEER STATS CALCULATION
// ============================================================================

/**
 * Calculate comprehensive peer statistics for a game
 */
export const calculatePeerStats = (
  allScores: number[],
  currentScore: number
): PeerStats | null => {
  if (allScores.length === 0) return null;

  const sorted = [...allScores].sort((a, b) => a - b);

  return {
    count: allScores.length,
    percentile: calculatePercentile(allScores, currentScore),
    topPercentage: calculateTopPercentage(calculatePercentile(allScores, currentScore)),
    rank: calculateRank(allScores, currentScore),
    median: getPercentileValue(allScores, 50),
    mean: Math.round(calculateMean(allScores)),
    stdDev: Math.round(calculateStdDev(allScores) * 10) / 10,
    p10: getPercentileValue(allScores, 10),
    p25: getPercentileValue(allScores, 25),
    p75: getPercentileValue(allScores, 75),
    p90: getPercentileValue(allScores, 90),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
};

/**
 * Fetch all scores for a specific game from database
 */
export const fetchGameScores = async (
  supabase: SupabaseClient,
  gameId: string
): Promise<number[]> => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('progress');

    if (error || !players) {
      console.warn('Failed to fetch peer scores:', error);
      return [];
    }

    const scores: number[] = [];
    players.forEach(player => {
      const attempts = (player?.progress?.attempts || []) as Attempt[];
      attempts.forEach(attempt => {
        if (attempt?.gameId === gameId && typeof attempt.score === 'number') {
          scores.push(attempt.score);
        }
      });
    });

    return scores;
  } catch (err) {
    console.warn('Peer score fetch exception:', err);
    return [];
  }
};

/**
 * Fetch all scores for a skill category across multiple games
 */
export const fetchCategoryScores = async (
  supabase: SupabaseClient,
  skillCategory: SkillCategory,
  excludeGameId?: string
): Promise<{ scores: number[]; gameCount: number; playerCount: number }> => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, progress');

    if (error || !players) {
      console.warn('Failed to fetch category scores:', error);
      return { scores: [], gameCount: 0, playerCount: 0 };
    }

    const scores: number[] = [];
    const gameIds = new Set<string>();
    const playerIds = new Set<string>();

    players.forEach(player => {
      const attempts = (player?.progress?.attempts || []) as Attempt[];
      attempts.forEach(attempt => {
        if (
          attempt?.skill === skillCategory &&
          typeof attempt.score === 'number' &&
          attempt.gameId !== excludeGameId
        ) {
          scores.push(attempt.score);
          gameIds.add(attempt.gameId);
          playerIds.add(player.id);
        }
      });
    });

    return {
      scores,
      gameCount: gameIds.size,
      playerCount: playerIds.size,
    };
  } catch (err) {
    console.warn('Category score fetch exception:', err);
    return { scores: [], gameCount: 0, playerCount: 0 };
  }
};

/**
 * Calculate skill-category-wide percentiles
 */
export const calculateCategoryStats = async (
  supabase: SupabaseClient,
  skillCategory: SkillCategory,
  currentScore: number,
  currentGameId: string,
  config: PeerComparisonConfig = DEFAULT_PEER_CONFIG
): Promise<CategoryPeerStats | null> => {
  if (!config.enableCategoryPercentiles) return null;

  const { scores, gameCount, playerCount } = await fetchCategoryScores(
    supabase,
    skillCategory,
    currentGameId
  );

  if (scores.length < config.minPeerCount || gameCount < config.minCategoryGames) {
    return null;
  }

  const baseStats = calculatePeerStats(scores, currentScore);
  if (!baseStats) return null;

  return {
    ...baseStats,
    skillCategory,
    gamesIncluded: gameCount,
    uniquePlayers: playerCount,
  };
};

// ============================================================================
// CURVE MODE SCORING
// ============================================================================

/**
 * Apply bell curve adjustment to score
 * Shifts scores toward target median
 */
const applyBellCurve = (
  score: number,
  peerStats: PeerStats,
  targetMedian: number,
  strength: number
): number => {
  const currentMedian = peerStats.median;
  const shift = targetMedian - currentMedian;

  // Calculate z-score (how many std devs from mean)
  const zScore = peerStats.stdDev > 0
    ? (score - peerStats.mean) / peerStats.stdDev
    : 0;

  // Apply curve: shift toward target, scaled by strength
  // Scores near the median shift more, extreme scores shift less
  const curveAdjustment = shift * strength * (1 - Math.abs(zScore) / 3);

  return Math.max(0, Math.min(100, Math.round(score + curveAdjustment)));
};

/**
 * Apply linear curve adjustment
 * Linearly scales scores to target range
 */
const applyLinearCurve = (
  score: number,
  peerStats: PeerStats,
  targetMedian: number,
  strength: number
): number => {
  // Scale factor to shift median toward target
  const scaleFactor = targetMedian / Math.max(1, peerStats.median);
  const adjustedScale = 1 + (scaleFactor - 1) * strength;

  return Math.max(0, Math.min(100, Math.round(score * adjustedScale)));
};

/**
 * Apply square root curve (compresses high scores, expands low scores)
 */
const applySqrtCurve = (
  score: number,
  strength: number
): number => {
  // Transform: new_score = sqrt(score) * 10 (maps 0-100 to 0-100)
  const sqrtScore = Math.sqrt(score) * 10;
  // Blend with original based on strength
  return Math.round(score * (1 - strength) + sqrtScore * strength);
};

/**
 * Apply curve mode to score based on peer distribution
 */
export const applyCurveMode = (
  score: number,
  peerStats: PeerStats,
  config: PeerComparisonConfig = DEFAULT_PEER_CONFIG
): CurveModeResult => {
  if (!config.enableCurveMode || config.curveType === 'none') {
    return {
      originalScore: score,
      curvedScore: score,
      adjustment: 0,
      curveType: 'none',
      curveStrength: 0,
      reason: 'Curve mode disabled',
    };
  }

  // Don't curve if not enough peers
  if (peerStats.count < config.minPeerCount) {
    return {
      originalScore: score,
      curvedScore: score,
      adjustment: 0,
      curveType: 'none',
      curveStrength: 0,
      reason: `Insufficient peer data (${peerStats.count} < ${config.minPeerCount})`,
    };
  }

  let curvedScore: number;
  let reason: string;

  switch (config.curveType) {
    case 'bell':
      curvedScore = applyBellCurve(
        score,
        peerStats,
        config.bellCurveTargetMedian,
        config.curveStrength
      );
      reason = `Bell curve applied (target median: ${config.bellCurveTargetMedian})`;
      break;

    case 'linear':
      curvedScore = applyLinearCurve(
        score,
        peerStats,
        config.bellCurveTargetMedian,
        config.curveStrength
      );
      reason = 'Linear curve applied';
      break;

    case 'sqrt':
      curvedScore = applySqrtCurve(score, config.curveStrength);
      reason = 'Square root curve applied';
      break;

    default:
      curvedScore = score;
      reason = 'No curve type specified';
  }

  return {
    originalScore: score,
    curvedScore,
    adjustment: curvedScore - score,
    curveType: config.curveType,
    curveStrength: config.curveStrength,
    reason,
  };
};

// ============================================================================
// INSIGHTS GENERATION
// ============================================================================

/**
 * Determine performance level based on percentile
 */
const getPerformanceLevel = (
  percentile: number
): 'exceptional' | 'above_average' | 'average' | 'below_average' | 'struggling' => {
  if (percentile >= 90) return 'exceptional';
  if (percentile >= 70) return 'above_average';
  if (percentile >= 40) return 'average';
  if (percentile >= 20) return 'below_average';
  return 'struggling';
};

/**
 * Generate peer comparison insights
 */
export const generatePeerInsights = (
  score: number,
  gameStats: PeerStats | null,
  categoryStats: CategoryPeerStats | null
): PeerInsight[] => {
  const insights: PeerInsight[] = [];

  if (!gameStats) return insights;

  // Top performer insights
  if (gameStats.topPercentage <= 5) {
    insights.push({
      type: 'achievement',
      message: `Outstanding! You're in the top ${gameStats.topPercentage}% of all players on this game!`,
      icon: '🏆',
    });
  } else if (gameStats.topPercentage <= 10) {
    insights.push({
      type: 'achievement',
      message: `Excellent! You're in the top ${gameStats.topPercentage}% - that's expert-level performance!`,
      icon: '🌟',
    });
  } else if (gameStats.topPercentage <= 25) {
    insights.push({
      type: 'achievement',
      message: `Great work! You're in the top ${gameStats.topPercentage}% of players.`,
      icon: '⭐',
    });
  }

  // Beat the median
  if (score > gameStats.median && gameStats.count >= 10) {
    const beatBy = score - gameStats.median;
    insights.push({
      type: 'comparison',
      message: `You beat the median score by ${beatBy} points (median: ${gameStats.median}).`,
      icon: '📈',
    });
  }

  // Room for improvement
  if (gameStats.topPercentage > 50 && gameStats.p90 > score) {
    const gap = gameStats.p90 - score;
    insights.push({
      type: 'tip',
      message: `Top performers score ${gameStats.p90}+. You're ${gap} points away from the top 10%.`,
      icon: '🎯',
    });
  }

  // Encouragement for lower scores
  if (gameStats.topPercentage > 75 && gameStats.count >= 10) {
    insights.push({
      type: 'encouragement',
      message: `This is a challenging game! The median score is ${gameStats.median}. Keep practicing!`,
      icon: '💪',
    });
  }

  // Category comparison
  if (categoryStats && categoryStats.count >= 20) {
    if (categoryStats.topPercentage <= 25) {
      insights.push({
        type: 'achievement',
        message: `You're in the top ${categoryStats.topPercentage}% across all ${categoryStats.skillCategory} games!`,
        icon: '🎖️',
      });
    } else if (categoryStats.percentile < 40) {
      insights.push({
        type: 'tip',
        message: `Your ${categoryStats.skillCategory} skills could use more practice. Try related games to improve!`,
        icon: '📚',
      });
    }
  }

  return insights;
};

// ============================================================================
// MAIN PEER COMPARISON FUNCTION
// ============================================================================

/**
 * Calculate comprehensive peer comparison including game stats, category stats,
 * curve mode, and insights
 */
export const calculatePeerComparison = async (
  supabase: SupabaseClient,
  gameId: string,
  skillCategory: SkillCategory,
  currentScore: number,
  config: PeerComparisonConfig = DEFAULT_PEER_CONFIG
): Promise<PeerComparisonResult> => {
  // Fetch game-specific scores
  const gameScores = await fetchGameScores(supabase, gameId);

  // Calculate game stats
  const gameStats = gameScores.length >= config.minPeerCount
    ? calculatePeerStats(gameScores, currentScore)
    : null;

  // Calculate category stats
  const categoryStats = await calculateCategoryStats(
    supabase,
    skillCategory,
    currentScore,
    gameId,
    config
  );

  // Apply curve mode if enabled and we have stats
  const curveResult = gameStats
    ? applyCurveMode(currentScore, gameStats, config)
    : null;

  // Generate insights
  const insights = generatePeerInsights(currentScore, gameStats, categoryStats);

  // Determine overall performance level
  const performanceLevel = gameStats
    ? getPerformanceLevel(gameStats.percentile)
    : 'average';

  return {
    gameStats,
    categoryStats,
    curveResult,
    insights,
    performanceLevel,
  };
};

// ============================================================================
// FEEDBACK FORMATTING
// ============================================================================

/**
 * Format peer comparison as HTML feedback
 */
export const formatPeerComparisonFeedback = (
  result: PeerComparisonResult,
  playerScore: number,
  showDetails: boolean = true
): string => {
  if (!result.gameStats && !result.categoryStats) {
    return ''; // Not enough data for peer comparison
  }

  let html = '';

  // Main peer comparison block
  if (result.gameStats && result.gameStats.count >= 5) {
    const stats = result.gameStats;
    const topPctColor = stats.topPercentage <= 10 ? '#10b981' :
                        stats.topPercentage <= 25 ? '#3b82f6' :
                        stats.topPercentage <= 50 ? '#f59e0b' : '#94a3b8';

    const topPctIcon = stats.topPercentage <= 5 ? '🏆' :
                       stats.topPercentage <= 10 ? '🌟' :
                       stats.topPercentage <= 25 ? '⭐' :
                       stats.topPercentage <= 50 ? '📊' : '📈';

    html += `
<div style="background:#0f172a;padding:12px;border-radius:8px;border:1px solid #3b82f6;margin-bottom:12px;">
  <p><strong>${topPctIcon} Peer Comparison</strong></p>
  <p style="font-size:1.1em;margin:8px 0;">
    You're in the <strong style="color:${topPctColor};">top ${stats.topPercentage}%</strong> of players on this game!
  </p>
  <p style="color:#94a3b8;font-size:0.9em;">
    Rank: #${stats.rank} of ${stats.count} players |
    Your score: ${playerScore} |
    Median: ${stats.median}
  </p>`;

    if (showDetails) {
      html += `
  <details style="margin-top:8px;">
    <summary style="cursor:pointer;color:#60a5fa;">Score Distribution</summary>
    <div style="margin-top:6px;font-size:0.85em;color:#94a3b8;">
      <p>📊 Distribution: ${stats.min} - ${stats.p25} - <strong>${stats.median}</strong> - ${stats.p75} - ${stats.max}</p>
      <p>📈 Top 10% score: ${stats.p90}+ | Average: ${stats.mean}</p>
      <p>📐 Std Dev: ${stats.stdDev} (${stats.stdDev < 15 ? 'tight' : stats.stdDev < 25 ? 'moderate' : 'wide'} spread)</p>
    </div>
  </details>`;
    }

    html += `\n</div>`;
  }

  // Category-wide stats
  if (result.categoryStats && result.categoryStats.count >= 20) {
    const catStats = result.categoryStats;
    const catColor = catStats.topPercentage <= 25 ? '#10b981' :
                     catStats.topPercentage <= 50 ? '#3b82f6' : '#94a3b8';

    html += `
<div style="background:#0f172a;padding:10px;border-radius:8px;border:1px solid #6366f1;margin-bottom:10px;">
  <p><strong>🎯 ${catStats.skillCategory.charAt(0).toUpperCase() + catStats.skillCategory.slice(1)} Skill Ranking</strong></p>
  <p style="font-size:0.95em;">
    Across ${catStats.gamesIncluded} ${catStats.skillCategory} games, you're in the
    <strong style="color:${catColor};">top ${catStats.topPercentage}%</strong>
    (${catStats.uniquePlayers} players)
  </p>
</div>`;
  }

  // Insights
  if (result.insights.length > 0) {
    const insightItems = result.insights
      .slice(0, 3) // Limit to 3 insights
      .map(i => `<li>${i.icon} ${i.message}</li>`)
      .join('');

    html += `
<div style="background:#0f172a;padding:10px;border-radius:8px;border:1px solid #8b5cf6;margin-bottom:10px;">
  <p><strong>💡 Insights</strong></p>
  <ul style="margin:6px 0;padding-left:20px;font-size:0.9em;">
    ${insightItems}
  </ul>
</div>`;
  }

  // Curve mode notice (if applied)
  if (result.curveResult && result.curveResult.adjustment !== 0) {
    const direction = result.curveResult.adjustment > 0 ? '📈' : '📉';
    html += `
<div style="background:#1e1e2e;padding:8px;border-radius:6px;border:1px dashed #6366f1;margin-bottom:10px;font-size:0.85em;">
  <p>${direction} <strong>Curve Applied:</strong> ${result.curveResult.reason}</p>
  <p style="color:#94a3b8;">Score adjusted from ${result.curveResult.originalScore} to ${result.curveResult.curvedScore} (${result.curveResult.adjustment > 0 ? '+' : ''}${result.curveResult.adjustment})</p>
</div>`;
  }

  return html;
};

/**
 * Format concise "top X%" badge for display
 */
export const formatTopPercentageBadge = (
  gameStats: PeerStats | null
): string => {
  if (!gameStats || gameStats.count < 5) return '';

  const topPct = gameStats.topPercentage;

  if (topPct <= 5) {
    return `<span style="background:#10b981;color:white;padding:2px 8px;border-radius:12px;font-size:0.8em;">🏆 Top ${topPct}%</span>`;
  } else if (topPct <= 10) {
    return `<span style="background:#3b82f6;color:white;padding:2px 8px;border-radius:12px;font-size:0.8em;">🌟 Top ${topPct}%</span>`;
  } else if (topPct <= 25) {
    return `<span style="background:#6366f1;color:white;padding:2px 8px;border-radius:12px;font-size:0.8em;">⭐ Top ${topPct}%</span>`;
  } else if (topPct <= 50) {
    return `<span style="background:#64748b;color:white;padding:2px 8px;border-radius:12px;font-size:0.8em;">Top ${topPct}%</span>`;
  }

  return '';
};

export default {
  calculatePeerStats,
  calculatePeerComparison,
  applyCurveMode,
  fetchGameScores,
  fetchCategoryScores,
  calculateCategoryStats,
  generatePeerInsights,
  formatPeerComparisonFeedback,
  formatTopPercentageBadge,
  DEFAULT_PEER_CONFIG,
};
