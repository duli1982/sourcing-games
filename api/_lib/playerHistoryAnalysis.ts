/**
 * Player History Analysis Module
 *
 * Analyzes player scoring history to provide personalized feedback.
 * Identifies patterns, trends, strengths, and areas for improvement.
 * Provides continuity feedback referencing past struggles and improvements.
 *
 * @version 2.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getPlayerHistory, PlayerHistory } from './scoringAnalytics.js';

// ============================================================================
// Types
// ============================================================================

export interface SimilarGamePerformance {
  gameId: string;
  gameTitle: string;
  score: number;
  timestamp: string;
  skillCategory: string;
}

export interface SkillProgress {
  skillCategory: string;
  attempts: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  trend: 'improving' | 'stable' | 'declining' | 'new';
  recentScores: number[];
  lastAttemptDate: string;
  improvementFromFirst: number; // % improvement from first to last attempt
}

export interface ContinuityInsight {
  type: 'improvement' | 'struggle' | 'consistent' | 'first_in_category' | 'returning';
  message: string;
  context: {
    previousScore?: number;
    currentScore?: number;
    skillCategory?: string;
    timeSinceLastAttempt?: string;
    improvementPercent?: number;
  };
}

export interface PlayerAnalysis {
  playerId: string;
  playerName: string;

  // Overall stats
  totalGamesPlayed: number;
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;

  // Trend analysis
  trend: 'improving' | 'stable' | 'declining' | 'new';
  trendDescription: string;
  improvementRate: number; // Percentage improvement from first games to recent

  // Performance level
  performanceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  performanceLevelDescription: string;

  // Skill analysis - enhanced with progress tracking
  strongestSkills: string[];
  weakestSkills: string[];
  skillBreakdown: Record<string, { avgScore: number; attempts: number }>;
  skillProgress: Record<string, SkillProgress>;

  // Consistency analysis
  consistencyScore: number; // 0-100, higher = more consistent
  consistencyLevel: 'very_inconsistent' | 'inconsistent' | 'moderate' | 'consistent' | 'very_consistent';

  // Recent performance
  recentGames: Array<{
    gameId: string;
    gameTitle: string;
    score: number;
    timestamp: string;
  }>;
  recentAvgScore: number;

  // Achievements and milestones
  gamesAbove80: number;
  gamesBelow50: number;
  highScoreStreak: number;
  currentStreak: number;

  // Personalization suggestions
  suggestedFocus: string[];
  encouragement: string;
  nextSteps: string[];
}

export interface PersonalizedFeedbackContext {
  playerAnalysis: PlayerAnalysis;
  currentGameId: string;
  currentGameTitle: string;
  currentGameSkill: string;
  currentScore: number;
  isFirstAttempt: boolean;
  isPersonalBest: boolean;
  isWorstScore: boolean;
  comparedToAverage: 'above' | 'at' | 'below';
  comparedToRecent: 'above' | 'at' | 'below';

  // Enhanced: Similar game analysis
  similarGames: SimilarGamePerformance[];
  skillProgress: SkillProgress | null;
  continuityInsights: ContinuityInsight[];
  isFirstInCategory: boolean;
  previousAttemptInCategory: SimilarGamePerformance | null;
  categoryAvgScore: number;
  categoryBestScore: number;
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Get and analyze player history
 */
export async function analyzePlayerHistory(
  supabase: SupabaseClient,
  playerId: string,
  playerName?: string
): Promise<PlayerAnalysis | null> {
  try {
    // Get player history from database
    const history = await getPlayerHistory(supabase, playerId);

    if (!history) {
      // Return a new player analysis for players without history
      return createNewPlayerAnalysis(playerId, playerName);
    }

    return buildPlayerAnalysis(history);
  } catch (error) {
    console.error('[PlayerHistoryAnalysis] Error analyzing player history:', error);
    return null;
  }
}

/**
 * Create analysis for new players without history
 */
function createNewPlayerAnalysis(playerId: string, playerName?: string): PlayerAnalysis {
  return {
    playerId,
    playerName: playerName || playerId,
    totalGamesPlayed: 0,
    totalAttempts: 0,
    avgScore: 0,
    bestScore: 0,
    worstScore: 0,
    trend: 'new',
    trendDescription: 'Welcome! This is your first game.',
    improvementRate: 0,
    performanceLevel: 'beginner',
    performanceLevelDescription: 'Just getting started',
    strongestSkills: [],
    weakestSkills: [],
    skillBreakdown: {},
    skillProgress: {},
    consistencyScore: 0,
    consistencyLevel: 'moderate',
    recentGames: [],
    recentAvgScore: 0,
    gamesAbove80: 0,
    gamesBelow50: 0,
    highScoreStreak: 0,
    currentStreak: 0,
    suggestedFocus: ['Focus on understanding the game requirements', 'Read the example solutions carefully'],
    encouragement: 'Welcome to the game! Take your time to understand each challenge.',
    nextSteps: ['Complete your first game', 'Review the feedback carefully', 'Try to improve on your next attempt'],
  };
}

/**
 * Build full player analysis from history data
 */
function buildPlayerAnalysis(history: PlayerHistory): PlayerAnalysis {
  // Determine performance level
  const performanceLevel = determinePerformanceLevel(history.avgScore);
  const performanceLevelDescription = getPerformanceLevelDescription(performanceLevel);

  // Calculate consistency
  const consistencyData = calculateConsistency(history.recentGames);

  // Determine trend description
  const trendDescription = getTrendDescription(history.scoreTrend, history.improvementRate);

  // Analyze skills (from recent games) - enhanced with progress tracking
  const skillAnalysis = analyzeSkillsWithProgress(history.recentGames);

  // Calculate streaks
  const streakData = calculateStreaks(history.recentGames);

  // Generate personalized suggestions
  const suggestions = generateSuggestions(history, performanceLevel, skillAnalysis);

  return {
    playerId: history.playerId,
    playerName: history.playerName,
    totalGamesPlayed: history.totalGamesPlayed,
    totalAttempts: history.totalAttempts,
    avgScore: history.avgScore,
    bestScore: history.bestScore,
    worstScore: history.worstScore,
    trend: history.scoreTrend,
    trendDescription,
    improvementRate: history.improvementRate,
    performanceLevel,
    performanceLevelDescription,
    strongestSkills: skillAnalysis.strongest,
    weakestSkills: skillAnalysis.weakest,
    skillBreakdown: skillAnalysis.breakdown,
    skillProgress: skillAnalysis.progress,
    consistencyScore: consistencyData.score,
    consistencyLevel: consistencyData.level,
    recentGames: history.recentGames,
    recentAvgScore: history.recentAvgScore,
    gamesAbove80: history.gamesAbove80,
    gamesBelow50: history.gamesBelow50,
    highScoreStreak: streakData.highScoreStreak,
    currentStreak: streakData.currentStreak,
    suggestedFocus: suggestions.focus,
    encouragement: suggestions.encouragement,
    nextSteps: suggestions.nextSteps,
  };
}

/**
 * Determine player performance level based on average score
 */
function determinePerformanceLevel(avgScore: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (avgScore >= 85) return 'expert';
  if (avgScore >= 70) return 'advanced';
  if (avgScore >= 50) return 'intermediate';
  return 'beginner';
}

/**
 * Get description for performance level
 */
function getPerformanceLevelDescription(level: 'beginner' | 'intermediate' | 'advanced' | 'expert'): string {
  switch (level) {
    case 'expert':
      return 'Expert sourcer with consistently high scores';
    case 'advanced':
      return 'Skilled sourcer with solid fundamentals';
    case 'intermediate':
      return 'Growing sourcer building core skills';
    case 'beginner':
      return 'Learning the basics of sourcing';
  }
}

/**
 * Get trend description
 */
function getTrendDescription(trend: string, improvementRate: number): string {
  const absRate = Math.abs(improvementRate);

  switch (trend) {
    case 'improving':
      if (absRate > 20) return `Great progress! Your scores have improved by ${absRate.toFixed(0)}%`;
      return 'Your scores are steadily improving - keep it up!';
    case 'declining':
      if (absRate > 20) return 'Your recent scores are lower than usual - let\'s work on getting back on track';
      return 'Slight dip in recent scores - focus on fundamentals';
    case 'stable':
      return 'Your performance is consistent - ready to push higher?';
    case 'new':
      return 'Just getting started - every game is a learning opportunity!';
    default:
      return 'Keep playing to establish your baseline performance';
  }
}

/**
 * Calculate consistency from recent games
 */
function calculateConsistency(recentGames: Array<{ score: number }>): {
  score: number;
  level: 'very_inconsistent' | 'inconsistent' | 'moderate' | 'consistent' | 'very_consistent';
} {
  if (!recentGames || recentGames.length < 3) {
    return { score: 50, level: 'moderate' };
  }

  const scores = recentGames.map(g => g.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Convert std dev to consistency score (lower std dev = higher consistency)
  const consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev * 3.33)));

  let level: 'very_inconsistent' | 'inconsistent' | 'moderate' | 'consistent' | 'very_consistent';
  if (consistencyScore >= 90) level = 'very_consistent';
  else if (consistencyScore >= 70) level = 'consistent';
  else if (consistencyScore >= 50) level = 'moderate';
  else if (consistencyScore >= 30) level = 'inconsistent';
  else level = 'very_inconsistent';

  return { score: Math.round(consistencyScore), level };
}

/**
 * Enhanced skill analysis with progress tracking
 */
function analyzeSkillsWithProgress(recentGames: Array<{ gameId: string; gameTitle: string; score: number; timestamp?: string }>): {
  strongest: string[];
  weakest: string[];
  breakdown: Record<string, { avgScore: number; attempts: number }>;
  progress: Record<string, SkillProgress>;
} {
  const skillData: Record<string, {
    scores: Array<{ score: number; timestamp: string; gameId: string; gameTitle: string }>;
  }> = {};

  // Group games by skill category
  for (const game of recentGames) {
    const skill = extractSkillCategory(game.gameTitle || game.gameId);
    if (!skillData[skill]) {
      skillData[skill] = { scores: [] };
    }
    skillData[skill].scores.push({
      score: game.score,
      timestamp: game.timestamp || new Date().toISOString(),
      gameId: game.gameId,
      gameTitle: game.gameTitle,
    });
  }

  // Build progress for each skill
  const progress: Record<string, SkillProgress> = {};
  const skillAverages: Array<{ skill: string; avgScore: number; attempts: number }> = [];

  for (const [skill, data] of Object.entries(skillData)) {
    // Sort by timestamp (oldest first) for trend analysis
    const sortedScores = [...data.scores].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const scores = sortedScores.map(s => s.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);

    // Calculate trend for this skill
    let skillTrend: 'improving' | 'stable' | 'declining' | 'new' = 'new';
    let improvementFromFirst = 0;

    if (scores.length >= 3) {
      const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
      const secondHalf = scores.slice(Math.ceil(scores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg + 5) skillTrend = 'improving';
      else if (secondAvg < firstAvg - 5) skillTrend = 'declining';
      else skillTrend = 'stable';

      improvementFromFirst = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    } else if (scores.length >= 2) {
      const first = scores[0];
      const last = scores[scores.length - 1];
      if (last > first + 5) skillTrend = 'improving';
      else if (last < first - 5) skillTrend = 'declining';
      else skillTrend = 'stable';
      improvementFromFirst = first > 0 ? ((last - first) / first) * 100 : 0;
    }

    progress[skill] = {
      skillCategory: skill,
      attempts: scores.length,
      avgScore,
      bestScore,
      worstScore,
      trend: skillTrend,
      recentScores: scores.slice(-5), // Last 5 scores
      lastAttemptDate: sortedScores[sortedScores.length - 1]?.timestamp || '',
      improvementFromFirst: Math.round(improvementFromFirst),
    };

    skillAverages.push({ skill, avgScore, attempts: scores.length });
  }

  // Sort by average score
  skillAverages.sort((a, b) => b.avgScore - a.avgScore);

  // Build breakdown
  const breakdown: Record<string, { avgScore: number; attempts: number }> = {};
  for (const item of skillAverages) {
    breakdown[item.skill] = { avgScore: item.avgScore, attempts: item.attempts };
  }

  // Get strongest and weakest (with at least 2 attempts)
  const qualified = skillAverages.filter(s => s.attempts >= 2);
  const strongest = qualified.slice(0, 3).map(s => s.skill);
  const weakest = qualified.slice(-3).reverse().map(s => s.skill);

  return { strongest, weakest, breakdown, progress };
}

/**
 * Extract skill category from game title
 */
function extractSkillCategory(gameTitle: string): string {
  const title = gameTitle.toLowerCase();

  // Common skill categories
  if (title.includes('boolean') || title.includes('search')) return 'Boolean Search';
  if (title.includes('linkedin')) return 'LinkedIn';
  if (title.includes('github')) return 'GitHub';
  if (title.includes('outreach') || title.includes('message')) return 'Outreach';
  if (title.includes('diversity') || title.includes('dei')) return 'DEI';
  if (title.includes('chrome') || title.includes('extension')) return 'Tools';
  if (title.includes('interview')) return 'Interview';
  if (title.includes('sourcing')) return 'General Sourcing';
  if (title.includes('data') || title.includes('analytics')) return 'Analytics';
  if (title.includes('negotiation') || title.includes('offer')) return 'Negotiation';
  if (title.includes('employer') || title.includes('brand')) return 'Employer Branding';
  if (title.includes('stack') || title.includes('overflow')) return 'Stack Overflow';
  if (title.includes('reddit')) return 'Reddit';
  if (title.includes('twitter') || title.includes('x.com')) return 'Twitter/X';

  return 'General';
}

/**
 * Calculate streaks from games
 */
function calculateStreaks(recentGames: Array<{ score: number }>): {
  highScoreStreak: number;
  currentStreak: number;
} {
  if (!recentGames || recentGames.length === 0) {
    return { highScoreStreak: 0, currentStreak: 0 };
  }

  let maxStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  // Games are ordered newest first, reverse for chronological
  const chronological = [...recentGames].reverse();

  for (const game of chronological) {
    if (game.score >= 80) {
      tempStreak++;
      maxStreak = Math.max(maxStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Calculate current streak from most recent games
  for (const game of recentGames) {
    if (game.score >= 80) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { highScoreStreak: maxStreak, currentStreak };
}

/**
 * Generate personalized suggestions
 */
function generateSuggestions(
  history: PlayerHistory,
  performanceLevel: string,
  skillAnalysis: { strongest: string[]; weakest: string[]; progress: Record<string, SkillProgress> }
): {
  focus: string[];
  encouragement: string;
  nextSteps: string[];
} {
  const focus: string[] = [];
  const nextSteps: string[] = [];
  let encouragement: string;

  // Based on performance level
  switch (performanceLevel) {
    case 'expert':
      focus.push('Challenge yourself with harder games');
      focus.push('Help mentor other players');
      encouragement = 'Outstanding work! You\'re among the top performers.';
      nextSteps.push('Try games in your weaker skill areas');
      nextSteps.push('Aim for 100% on your best categories');
      break;

    case 'advanced':
      focus.push('Refine your technique in weaker areas');
      focus.push('Increase consistency across all games');
      encouragement = 'Great progress! You\'re building strong sourcing skills.';
      nextSteps.push('Focus on games scoring below 75');
      nextSteps.push('Review feedback from lower-scoring attempts');
      break;

    case 'intermediate':
      focus.push('Master the fundamentals in each category');
      focus.push('Study example solutions carefully');
      encouragement = 'You\'re making steady progress. Keep pushing!';
      nextSteps.push('Practice games in your strongest areas first');
      nextSteps.push('Take time to read all feedback thoroughly');
      break;

    case 'beginner':
    default:
      focus.push('Read game instructions and examples carefully');
      focus.push('Start with easier difficulty games');
      encouragement = 'Every expert was once a beginner. You\'re on the right path!';
      nextSteps.push('Complete 5+ games to establish your baseline');
      nextSteps.push('Focus on understanding the rubric criteria');
      break;
  }

  // Add skill-specific suggestions based on progress
  if (skillAnalysis.weakest.length > 0) {
    const weakestSkill = skillAnalysis.weakest[0];
    const weakestProgress = skillAnalysis.progress[weakestSkill];
    if (weakestProgress) {
      if (weakestProgress.trend === 'improving') {
        focus.push(`Great progress on ${weakestSkill}! Keep practicing to solidify your gains.`);
      } else if (weakestProgress.trend === 'declining') {
        focus.push(`${weakestSkill} needs attention - review fundamentals and try again.`);
      } else {
        focus.push(`Practice more ${weakestSkill} games to improve.`);
      }
    }
  }

  // Based on trend
  if (history.scoreTrend === 'declining') {
    nextSteps.push('Review fundamentals and take a fresh approach');
  } else if (history.scoreTrend === 'improving') {
    nextSteps.push('Maintain momentum and try harder challenges');
  }

  // Based on consistency
  if (history.gamesBelow50 > history.gamesAbove80) {
    nextSteps.push('Focus on completing games before submitting');
  }

  return { focus, encouragement, nextSteps };
}

// ============================================================================
// Continuity Feedback Generation
// ============================================================================

/**
 * Generate continuity insights based on player's history with similar games
 */
function generateContinuityInsights(
  currentScore: number,
  currentSkill: string,
  similarGames: SimilarGamePerformance[],
  skillProgress: SkillProgress | null
): ContinuityInsight[] {
  const insights: ContinuityInsight[] = [];

  if (similarGames.length === 0) {
    // First game in this category
    insights.push({
      type: 'first_in_category',
      message: `This is your first ${currentSkill} game! Your score sets the baseline for this skill.`,
      context: {
        currentScore,
        skillCategory: currentSkill,
      },
    });
    return insights;
  }

  // Get previous attempt in same category
  const previousAttempt = similarGames[0]; // Most recent
  const timeDiff = Date.now() - new Date(previousAttempt.timestamp).getTime();
  const daysSince = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  // Check for improvement or regression
  const scoreDiff = currentScore - previousAttempt.score;
  const improvementPercent = previousAttempt.score > 0 ? Math.round((scoreDiff / previousAttempt.score) * 100) : 0;

  if (daysSince > 7) {
    // Returning after a break
    insights.push({
      type: 'returning',
      message: `Welcome back to ${currentSkill}! It's been ${daysSince} days since your last attempt.`,
      context: {
        timeSinceLastAttempt: `${daysSince} days`,
        previousScore: previousAttempt.score,
        currentScore,
        skillCategory: currentSkill,
      },
    });
  }

  if (scoreDiff >= 10) {
    // Significant improvement
    insights.push({
      type: 'improvement',
      message: `Excellent improvement! You scored ${scoreDiff} points higher than your last ${currentSkill} game (${previousAttempt.score} → ${currentScore}).`,
      context: {
        previousScore: previousAttempt.score,
        currentScore,
        improvementPercent,
        skillCategory: currentSkill,
      },
    });
  } else if (scoreDiff <= -10) {
    // Significant regression
    insights.push({
      type: 'struggle',
      message: `This ${currentSkill} game was tougher - you scored ${Math.abs(scoreDiff)} points lower than last time (${previousAttempt.score} → ${currentScore}). Review the feedback to identify what changed.`,
      context: {
        previousScore: previousAttempt.score,
        currentScore,
        improvementPercent,
        skillCategory: currentSkill,
      },
    });
  } else {
    // Consistent performance
    insights.push({
      type: 'consistent',
      message: `Consistent ${currentSkill} performance! Your scores are stable around ${Math.round((previousAttempt.score + currentScore) / 2)}.`,
      context: {
        previousScore: previousAttempt.score,
        currentScore,
        skillCategory: currentSkill,
      },
    });
  }

  // Add trend-based insight if we have skill progress
  if (skillProgress && skillProgress.attempts >= 3) {
    if (skillProgress.trend === 'improving' && skillProgress.improvementFromFirst > 10) {
      insights.push({
        type: 'improvement',
        message: `Your ${currentSkill} skills have improved ${skillProgress.improvementFromFirst}% since you started! From an average of ${skillProgress.worstScore} to ${skillProgress.avgScore}.`,
        context: {
          improvementPercent: skillProgress.improvementFromFirst,
          skillCategory: currentSkill,
        },
      });
    } else if (skillProgress.trend === 'declining' && skillProgress.improvementFromFirst < -10) {
      insights.push({
        type: 'struggle',
        message: `Your ${currentSkill} scores have been trending down. Consider reviewing the fundamentals or trying easier games first.`,
        context: {
          improvementPercent: skillProgress.improvementFromFirst,
          skillCategory: currentSkill,
        },
      });
    }
  }

  return insights;
}

/**
 * Format time difference as human-readable string
 */
function formatTimeSince(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

// ============================================================================
// Personalized Feedback Generation
// ============================================================================

/**
 * Build context for personalized feedback generation - enhanced with similar games
 */
export async function buildFeedbackContext(
  supabase: SupabaseClient,
  playerId: string,
  playerName: string | undefined,
  currentGameId: string,
  currentGameTitle: string,
  currentGameSkill: string,
  currentScore: number
): Promise<PersonalizedFeedbackContext | null> {
  const analysis = await analyzePlayerHistory(supabase, playerId, playerName);

  if (!analysis) {
    return null;
  }

  // Extract skill category from current game
  const currentSkillCategory = extractSkillCategory(currentGameTitle);

  // Find similar games (same skill category)
  const similarGames: SimilarGamePerformance[] = analysis.recentGames
    .filter(g => extractSkillCategory(g.gameTitle) === currentSkillCategory && g.gameId !== currentGameId)
    .map(g => ({
      ...g,
      skillCategory: currentSkillCategory,
    }));

  // Get skill progress for current category
  const skillProgress = analysis.skillProgress[currentSkillCategory] || null;

  // Calculate category stats
  const categoryScores = similarGames.map(g => g.score);
  const categoryAvgScore = categoryScores.length > 0
    ? Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length)
    : currentScore;
  const categoryBestScore = categoryScores.length > 0 ? Math.max(...categoryScores) : currentScore;

  // Generate continuity insights
  const continuityInsights = generateContinuityInsights(
    currentScore,
    currentSkillCategory,
    similarGames,
    skillProgress
  );

  // Determine if this is a first attempt, personal best, etc.
  const isFirstAttempt = analysis.totalGamesPlayed === 0;
  const isPersonalBest = currentScore > analysis.bestScore;
  const isWorstScore = analysis.totalGamesPlayed > 0 && currentScore < analysis.worstScore;
  const isFirstInCategory = similarGames.length === 0;

  // Compare to average
  let comparedToAverage: 'above' | 'at' | 'below';
  if (currentScore > analysis.avgScore + 5) comparedToAverage = 'above';
  else if (currentScore < analysis.avgScore - 5) comparedToAverage = 'below';
  else comparedToAverage = 'at';

  // Compare to recent average
  let comparedToRecent: 'above' | 'at' | 'below';
  if (currentScore > analysis.recentAvgScore + 5) comparedToRecent = 'above';
  else if (currentScore < analysis.recentAvgScore - 5) comparedToRecent = 'below';
  else comparedToRecent = 'at';

  return {
    playerAnalysis: analysis,
    currentGameId,
    currentGameTitle,
    currentGameSkill: currentSkillCategory,
    currentScore,
    isFirstAttempt,
    isPersonalBest,
    isWorstScore,
    comparedToAverage,
    comparedToRecent,
    // Enhanced fields
    similarGames,
    skillProgress,
    continuityInsights,
    isFirstInCategory,
    previousAttemptInCategory: similarGames[0] || null,
    categoryAvgScore,
    categoryBestScore,
  };
}

/**
 * Generate personalized feedback HTML based on player context - enhanced with continuity
 */
export function generatePersonalizedFeedback(context: PersonalizedFeedbackContext): string {
  const {
    playerAnalysis: analysis,
    currentScore,
    currentGameSkill,
    isFirstAttempt,
    isPersonalBest,
    isWorstScore,
    comparedToAverage,
    continuityInsights,
    similarGames,
    skillProgress,
    isFirstInCategory,
    previousAttemptInCategory,
    categoryAvgScore,
    categoryBestScore,
  } = context;

  const parts: string[] = [];

  // =========================================================================
  // CONTINUITY FEEDBACK - What changed since last similar game
  // =========================================================================

  if (continuityInsights.length > 0) {
    const continuityHtml = continuityInsights.map(insight => {
      let bgColor = '#0f172a';
      let borderColor = '#334155';
      let icon = '📊';

      switch (insight.type) {
        case 'improvement':
          bgColor = '#052e16';
          borderColor = '#22c55e';
          icon = '📈';
          break;
        case 'struggle':
          bgColor = '#3f0a0a';
          borderColor = '#ef4444';
          icon = '📉';
          break;
        case 'first_in_category':
          bgColor = '#0f3460';
          borderColor = '#3b82f6';
          icon = '🆕';
          break;
        case 'returning':
          bgColor = '#1e1b4b';
          borderColor = '#8b5cf6';
          icon = '👋';
          break;
        case 'consistent':
          bgColor = '#0f172a';
          borderColor = '#64748b';
          icon = '➡️';
          break;
      }

      return `
<div style="background:${bgColor};padding:10px;border-radius:8px;border:1px solid ${borderColor};margin-bottom:8px;">
  <p>${icon} <strong>${insight.message}</strong></p>
</div>`;
    }).join('');

    parts.push(`
<div style="margin-bottom:12px;">
  <p style="color:#a78bfa;font-size:0.9em;margin-bottom:6px;"><strong>Your ${currentGameSkill} Journey</strong></p>
  ${continuityHtml}
</div>`);
  }

  // =========================================================================
  // CATEGORY-SPECIFIC STATS
  // =========================================================================

  if (similarGames.length >= 2 && skillProgress) {
    const categoryTrendIcon = skillProgress.trend === 'improving' ? '📈' :
      skillProgress.trend === 'declining' ? '📉' : '➡️';
    const categoryTrendColor = skillProgress.trend === 'improving' ? '#22c55e' :
      skillProgress.trend === 'declining' ? '#f97316' : '#64748b';

    // Compare current to category average
    const vsCategory = currentScore > categoryAvgScore + 5 ? 'above' :
      currentScore < categoryAvgScore - 5 ? 'below' : 'at';
    const vsCategoryText = vsCategory === 'above' ? 'above your average' :
      vsCategory === 'below' ? 'below your average' : 'at your average';

    parts.push(`
<div style="background:#0b1220;padding:10px;border-radius:8px;border:1px solid #1e3a5f;margin-bottom:10px;">
  <p><strong>Your ${currentGameSkill} Stats</strong></p>
  <ul style="margin:8px 0;padding-left:20px;font-size:0.95em;">
    <li>This score: <strong>${currentScore}</strong> (${vsCategoryText})</li>
    <li>Your ${currentGameSkill} average: <strong>${categoryAvgScore}</strong></li>
    <li>Your ${currentGameSkill} best: <strong>${categoryBestScore}</strong>${currentScore > categoryBestScore ? ' (NEW!)' : ''}</li>
    <li style="color:${categoryTrendColor};">${categoryTrendIcon} Category trend: <strong>${skillProgress.trend}</strong></li>
    <li>Games in this category: <strong>${skillProgress.attempts + 1}</strong></li>
  </ul>
</div>`);
  }

  // =========================================================================
  // PERSONAL MILESTONE CALLOUTS
  // =========================================================================

  if (isFirstAttempt) {
    parts.push(`
<div style="background:#0f3460;padding:12px;border-radius:8px;border:1px solid #3b82f6;margin-bottom:10px;">
  <p><strong>Welcome!</strong> This is your first game score.</p>
  <p>${analysis.encouragement}</p>
</div>`);
  } else if (isPersonalBest) {
    parts.push(`
<div style="background:#052e16;padding:12px;border-radius:8px;border:1px solid #22c55e;margin-bottom:10px;">
  <p><strong>NEW PERSONAL BEST!</strong></p>
  <p>You beat your previous best of ${analysis.bestScore} with ${currentScore}!</p>
  <p>Keep pushing for even higher scores!</p>
</div>`);
  } else if (isWorstScore && analysis.totalGamesPlayed >= 5) {
    parts.push(`
<div style="background:#3f0a0a;padding:12px;border-radius:8px;border:1px solid #ef4444;margin-bottom:10px;">
  <p><strong>Tough one!</strong></p>
  <p>This score is below your usual performance. Your average is ${Math.round(analysis.avgScore)}.</p>
  <p>Review the feedback and try a different approach next time.</p>
</div>`);
  }

  // =========================================================================
  // TREND AND PERFORMANCE CONTEXT (for returning players)
  // =========================================================================

  if (analysis.totalGamesPlayed >= 3) {
    let trendIcon = '';
    let trendColor = '#64748b';

    if (analysis.trend === 'improving') {
      trendIcon = '📈';
      trendColor = '#22c55e';
    } else if (analysis.trend === 'declining') {
      trendIcon = '📉';
      trendColor = '#f97316';
    } else {
      trendIcon = '➡️';
    }

    parts.push(`
<details style="background:#0b1220;padding:10px;border-radius:8px;border:1px solid #334155;margin-bottom:10px;">
  <summary style="cursor:pointer;color:#60a5fa;"><strong>Your Overall Performance Profile</strong></summary>
  <ul style="margin:8px 0;padding-left:20px;">
    <li>Level: <strong>${analysis.performanceLevelDescription}</strong></li>
    <li>Overall Average: <strong>${Math.round(analysis.avgScore)}</strong> (this game: ${currentScore} - ${comparedToAverage === 'above' ? 'above' : comparedToAverage === 'below' ? 'below' : 'at'} average)</li>
    <li style="color:${trendColor};">${trendIcon} Overall Trend: ${analysis.trendDescription}</li>
    <li>Total Games Played: ${analysis.totalGamesPlayed}</li>
  </ul>
</details>`);
  }

  // =========================================================================
  // SKILL INSIGHTS (collapsible)
  // =========================================================================

  if (analysis.strongestSkills.length > 0 || analysis.weakestSkills.length > 0) {
    const strengthsList = analysis.strongestSkills.length > 0
      ? `<p><strong>Strengths:</strong> ${analysis.strongestSkills.join(', ')}</p>`
      : '';
    const growthList = analysis.weakestSkills.length > 0
      ? `<p><strong>Growth areas:</strong> ${analysis.weakestSkills.join(', ')}</p>`
      : '';

    // Add specific advice for weak areas
    let weakAreaAdvice = '';
    if (analysis.weakestSkills.length > 0) {
      const weakestSkill = analysis.weakestSkills[0];
      const weakProgress = analysis.skillProgress[weakestSkill];
      if (weakProgress) {
        if (weakProgress.trend === 'improving') {
          weakAreaAdvice = `<p style="color:#22c55e;">Good news: Your ${weakestSkill} scores are improving!</p>`;
        } else if (weakProgress.avgScore < 50) {
          weakAreaAdvice = `<p style="color:#f97316;">Tip: Review the example solutions for ${weakestSkill} games before your next attempt.</p>`;
        }
      }
    }

    parts.push(`
<details style="background:#0f172a;padding:10px;border-radius:8px;border:1px solid #1e3a5f;margin-bottom:10px;">
  <summary style="cursor:pointer;color:#93c5fd;"><strong>Your Skill Profile</strong></summary>
  <div style="margin-top:8px;">
    ${strengthsList}
    ${growthList}
    ${weakAreaAdvice}
  </div>
</details>`);
  }

  // =========================================================================
  // PERSONALIZED NEXT STEPS
  // =========================================================================

  if (analysis.nextSteps.length > 0) {
    // Add skill-specific next step if relevant
    const skillSpecificStep = skillProgress && skillProgress.trend === 'declining'
      ? `<li style="color:#f97316;">Focus on ${currentGameSkill} fundamentals before trying more advanced games</li>`
      : '';

    const stepsList = analysis.nextSteps.map(step => `<li>${step}</li>`).join('');
    parts.push(`
<details style="background:#0f172a;padding:10px;border-radius:8px;border:1px solid #1e3a5f;margin-bottom:10px;">
  <summary style="cursor:pointer;color:#a78bfa;"><strong>Recommended Next Steps</strong></summary>
  <ul style="margin-top:8px;padding-left:20px;">
    ${skillSpecificStep}
    ${stepsList}
  </ul>
</details>`);
  }

  // =========================================================================
  // STREAK CALLOUT
  // =========================================================================

  if (analysis.currentStreak >= 3) {
    parts.push(`
<p style="color:#22c55e;"><strong>🔥 You're on a ${analysis.currentStreak}-game hot streak with scores of 80+! Keep it going!</strong></p>`);
  }

  // =========================================================================
  // FIRST-IN-CATEGORY ENCOURAGEMENT
  // =========================================================================

  if (isFirstInCategory && !isFirstAttempt) {
    parts.push(`
<p style="color:#60a5fa;font-size:0.9em;">This was your first <strong>${currentGameSkill}</strong> game. Play more games in this category to track your progress!</p>`);
  }

  return parts.join('');
}
