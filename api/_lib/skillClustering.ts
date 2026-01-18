/**
 * Skill Clustering & Cross-Game Progression Service
 *
 * Uses embeddings to cluster similar games and track skill progression
 * across related games, not just per-game.
 *
 * @version 1.0.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Game, SkillCategory } from '../../types.js';
import { cosineSimilarity } from './referenceAnswers.js';

// ============================================================================
// Types
// ============================================================================

export interface GameEmbedding {
  gameId: string;
  gameTitle: string;
  skillCategory: SkillCategory;
  difficulty: string;
  contentEmbedding: number[];
  skillTags: string[];
}

export interface SimilarGame {
  gameId: string;
  gameTitle: string;
  skillCategory: string;
  difficulty: string;
  similarity: number;
  relationshipType: 'prerequisite' | 'parallel' | 'advanced' | 'variation' | 'related';
}

export interface GameCluster {
  id: string;
  clusterName: string;
  clusterType: 'skill' | 'difficulty' | 'hybrid' | 'semantic';
  gameIds: string[];
  primarySkill: string;
  avgDifficulty: number;
  avgScore: number;
  gameCount: number;
}

export interface PlayerClusterProgress {
  clusterId: string;
  clusterName: string;
  clusterType: string;
  primarySkill: string;
  gamesPlayed: number;
  totalGames: number;
  completionRate: number;
  avgScore: number;
  bestScore: number;
  scoreTrend: 'improving' | 'stable' | 'declining' | 'new';
  improvementRate: number;
  lastPlayedAt: string | null;
}

export interface CrossGameProgression {
  fromGameId: string;
  toGameId: string;
  gameSimilarity: number;
  fromScore: number;
  toScore: number;
  scoreChange: number;
  skillTransferred: boolean;
  transferEffectiveness: number;
  daysBetween: number;
}

export interface SkillProgressionInsight {
  type: 'improvement' | 'struggle' | 'mastery' | 'skill_transfer' | 'recommendation';
  title: string;
  message: string;
  relatedGames: string[];
  metrics?: {
    previousScore?: number;
    currentScore?: number;
    improvementPercent?: number;
    clusterAvg?: number;
    transferRate?: number;
  };
}

export interface RelatedGameRecommendation {
  gameId: string;
  gameTitle: string;
  skillCategory: string;
  difficulty: string;
  reason: string;
  similarityScore: number;
  priority: number;
}

export interface ClusterAnalysis {
  clusterId: string;
  clusterName: string;
  progress: PlayerClusterProgress | null;
  relatedGames: SimilarGame[];
  insights: SkillProgressionInsight[];
  recommendations: RelatedGameRecommendation[];
}

// ============================================================================
// Configuration
// ============================================================================

export const CLUSTERING_CONFIG = {
  // Minimum similarity to consider games related
  minSimilarityThreshold: 0.5,

  // Minimum games in a cluster to calculate meaningful stats
  minGamesForStats: 3,

  // Weights for overall similarity calculation
  weights: {
    content: 0.50,   // Semantic similarity from embeddings
    skill: 0.35,     // Same skill category bonus
    difficulty: 0.15, // Similar difficulty bonus
  },

  // Score thresholds for insights
  scoreThresholds: {
    mastery: 85,       // Considered mastered
    proficient: 70,    // Good understanding
    learning: 50,      // Still learning
    struggling: 35,    // Needs help
  },

  // Time windows for recency
  recentDays: 14,
};

// ============================================================================
// In-Memory Cache for Game Similarities
// ============================================================================

interface SimilarityCache {
  pairs: Map<string, number>; // "gameA:gameB" -> similarity
  computed: Date;
}

let similarityCache: SimilarityCache | null = null;

const getCachePairKey = (gameIdA: string, gameIdB: string): string => {
  return gameIdA < gameIdB ? `${gameIdA}:${gameIdB}` : `${gameIdB}:${gameIdA}`;
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Convert embedding array to pgvector format string
 */
const toPgVector = (embedding: number[]): string => {
  return `[${embedding.join(',')}]`;
};

/**
 * Calculate difficulty as numeric value
 */
const difficultyToNumber = (difficulty: string): number => {
  switch (difficulty) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
    default: return 2;
  }
};

/**
 * Calculate overall similarity between two games
 */
export const calculateGameSimilarity = (
  gameA: { skillCategory: string; difficulty: string; embedding?: number[] },
  gameB: { skillCategory: string; difficulty: string; embedding?: number[] }
): { overall: number; content: number; skill: number; difficulty: number } => {
  // Content similarity from embeddings
  let contentSim = 0;
  if (gameA.embedding && gameB.embedding && gameA.embedding.length > 0 && gameB.embedding.length > 0) {
    contentSim = cosineSimilarity(gameA.embedding, gameB.embedding);
  }

  // Skill category similarity
  const skillSim = gameA.skillCategory === gameB.skillCategory ? 1.0 : 0.3;

  // Difficulty similarity
  const diffA = difficultyToNumber(gameA.difficulty);
  const diffB = difficultyToNumber(gameB.difficulty);
  const diffDelta = Math.abs(diffA - diffB);
  const diffSim = diffDelta === 0 ? 1.0 : diffDelta === 1 ? 0.7 : 0.4;

  // Weighted overall
  const overall = (
    contentSim * CLUSTERING_CONFIG.weights.content +
    skillSim * CLUSTERING_CONFIG.weights.skill +
    diffSim * CLUSTERING_CONFIG.weights.difficulty
  );

  return { overall, content: contentSim, skill: skillSim, difficulty: diffSim };
};

/**
 * Determine relationship type between games
 */
export const determineRelationship = (
  gameA: { skillCategory: string; difficulty: string },
  gameB: { skillCategory: string; difficulty: string },
  contentSimilarity: number
): 'prerequisite' | 'parallel' | 'advanced' | 'variation' | 'related' => {
  const sameSkill = gameA.skillCategory === gameB.skillCategory;
  const diffA = difficultyToNumber(gameA.difficulty);
  const diffB = difficultyToNumber(gameB.difficulty);

  if (sameSkill) {
    if (diffA < diffB) return 'prerequisite';
    if (diffA > diffB) return 'advanced';
    return 'parallel';
  }

  if (contentSimilarity > 0.7) return 'variation';
  return 'related';
};

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Store game embedding in database
 */
export const storeGameEmbedding = async (
  supabase: SupabaseClient,
  game: Game,
  contentEmbedding: number[],
  taskEmbedding?: number[],
  exampleEmbedding?: number[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('game_embeddings')
      .upsert({
        game_id: game.id,
        game_title: game.title,
        skill_category: game.skillCategory,
        difficulty: game.difficulty,
        content_embedding: contentEmbedding,
        task_embedding: taskEmbedding || null,
        example_embedding: exampleEmbedding || null,
        skill_tags: extractSkillTags(game),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'game_id',
      });

    if (error) {
      console.error('[SkillClustering] Error storing game embedding:', error);
      return { success: false, error: error.message };
    }

    // Invalidate cache when embeddings change
    similarityCache = null;

    return { success: true };
  } catch (err) {
    console.error('[SkillClustering] Exception storing game embedding:', err);
    return { success: false, error: 'Database error' };
  }
};

/**
 * Extract skill tags from game content
 */
const extractSkillTags = (game: Game): string[] => {
  const tags: string[] = [game.skillCategory];

  const text = `${game.title} ${game.description} ${game.task}`.toLowerCase();

  // Common skill indicators
  const skillPatterns: Record<string, RegExp> = {
    'boolean-operators': /\b(and|or|not|boolean)\b/,
    'linkedin': /\blinkedin\b/,
    'github': /\bgithub\b/,
    'x-ray': /\bx.?ray\b/,
    'outreach': /\b(outreach|message|email|cold)\b/,
    'diversity': /\b(diversity|dei|inclusion|equity)\b/,
    'persona': /\b(persona|profile|candidate)\b/,
    'negotiation': /\b(negotiat|offer|salary|compensation)\b/,
    'sourcing': /\b(sourcing|source|talent)\b/,
    'screening': /\b(screen|resume|cv)\b/,
    'data': /\b(data|analytic|metric)\b/,
  };

  for (const [tag, pattern] of Object.entries(skillPatterns)) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)];
};

/**
 * Find games similar to a given game
 */
export const findSimilarGames = async (
  supabase: SupabaseClient,
  gameId: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    excludeGameIds?: string[];
  } = {}
): Promise<SimilarGame[]> => {
  const {
    limit = 5,
    minSimilarity = CLUSTERING_CONFIG.minSimilarityThreshold,
    excludeGameIds = [],
  } = options;

  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('find_similar_games', {
      p_game_id: gameId,
      p_limit: limit + excludeGameIds.length, // Get extra in case we need to filter
      p_min_similarity: minSimilarity,
    });

    if (error) {
      console.warn('[SkillClustering] find_similar_games RPC failed:', error.message);
      return await findSimilarGamesFallback(supabase, gameId, { limit, minSimilarity, excludeGameIds });
    }

    // Filter excluded games and map to SimilarGame type
    return (data ?? [])
      .filter((row: any) => !excludeGameIds.includes(row.game_id))
      .slice(0, limit)
      .map((row: any) => ({
        gameId: row.game_id,
        gameTitle: row.game_title,
        skillCategory: row.skill_category,
        difficulty: row.difficulty,
        similarity: row.similarity,
        relationshipType: determineRelationshipFromData(gameId, row),
      }));
  } catch (err) {
    console.error('[SkillClustering] Error finding similar games:', err);
    return [];
  }
};

/**
 * Fallback for finding similar games when RPC not available
 */
const findSimilarGamesFallback = async (
  supabase: SupabaseClient,
  gameId: string,
  options: { limit: number; minSimilarity: number; excludeGameIds: string[] }
): Promise<SimilarGame[]> => {
  try {
    // Get source game embedding
    const { data: sourceGame, error: sourceError } = await supabase
      .from('game_embeddings')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (sourceError || !sourceGame?.content_embedding) {
      return [];
    }

    // Get all other games
    const { data: allGames, error: allError } = await supabase
      .from('game_embeddings')
      .select('game_id, game_title, skill_category, difficulty, content_embedding')
      .neq('game_id', gameId)
      .not('content_embedding', 'is', null);

    if (allError || !allGames) {
      return [];
    }

    // Calculate similarities in memory
    const withSimilarity = allGames
      .filter((g: any) => !options.excludeGameIds.includes(g.game_id))
      .map((g: any) => {
        const similarity = calculateGameSimilarity(
          { skillCategory: sourceGame.skill_category, difficulty: sourceGame.difficulty, embedding: sourceGame.content_embedding },
          { skillCategory: g.skill_category, difficulty: g.difficulty, embedding: g.content_embedding }
        );

        return {
          gameId: g.game_id,
          gameTitle: g.game_title,
          skillCategory: g.skill_category,
          difficulty: g.difficulty,
          similarity: similarity.overall,
          relationshipType: determineRelationship(
            { skillCategory: sourceGame.skill_category, difficulty: sourceGame.difficulty },
            { skillCategory: g.skill_category, difficulty: g.difficulty },
            similarity.content
          ),
        };
      })
      .filter(g => g.similarity >= options.minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit);

    return withSimilarity;
  } catch (err) {
    console.error('[SkillClustering] Fallback similarity search failed:', err);
    return [];
  }
};

/**
 * Helper to determine relationship from DB data
 */
const determineRelationshipFromData = (
  sourceGameId: string,
  targetGame: { game_id: string; skill_category: string; difficulty: string }
): 'prerequisite' | 'parallel' | 'advanced' | 'variation' | 'related' => {
  // We need source game data - for now just return 'related'
  // This will be refined when we have more context
  return 'related';
};

/**
 * Get player's progress across skill clusters
 */
export const getPlayerClusterProgress = async (
  supabase: SupabaseClient,
  playerId: string
): Promise<PlayerClusterProgress[]> => {
  try {
    const { data, error } = await supabase.rpc('get_player_cluster_progress', {
      p_player_id: playerId,
    });

    if (error) {
      console.warn('[SkillClustering] get_player_cluster_progress RPC failed:', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      clusterId: row.cluster_id,
      clusterName: row.cluster_name,
      clusterType: row.cluster_type,
      primarySkill: row.primary_skill,
      gamesPlayed: row.games_played,
      totalGames: row.total_games,
      completionRate: row.completion_rate,
      avgScore: row.avg_score,
      bestScore: row.best_score,
      scoreTrend: row.score_trend,
      improvementRate: row.improvement_rate,
      lastPlayedAt: row.last_played_at,
    }));
  } catch (err) {
    console.error('[SkillClustering] Error getting player cluster progress:', err);
    return [];
  }
};

/**
 * Update player's cluster progress after completing a game
 */
export const updatePlayerClusterProgress = async (
  supabase: SupabaseClient,
  playerId: string,
  gameId: string,
  score: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.rpc('update_player_cluster_progress', {
      p_player_id: playerId,
      p_game_id: gameId,
      p_score: score,
    });

    if (error) {
      console.warn('[SkillClustering] update_player_cluster_progress RPC failed:', error.message);
      // Non-critical, don't fail the submission
      return { success: true };
    }

    return { success: true };
  } catch (err) {
    console.error('[SkillClustering] Error updating player cluster progress:', err);
    return { success: false, error: 'Database error' };
  }
};

/**
 * Log cross-game skill progression
 */
export const logCrossGameProgression = async (
  supabase: SupabaseClient,
  playerId: string,
  previousGame: { gameId: string; score: number; playedAt: string },
  currentGame: { gameId: string; score: number; playedAt: string }
): Promise<{ success: boolean; progressionId?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('log_cross_game_progression', {
      p_player_id: playerId,
      p_from_game_id: previousGame.gameId,
      p_from_score: previousGame.score,
      p_from_played_at: previousGame.playedAt,
      p_to_game_id: currentGame.gameId,
      p_to_score: currentGame.score,
      p_to_played_at: currentGame.playedAt,
    });

    if (error) {
      console.warn('[SkillClustering] log_cross_game_progression RPC failed:', error.message);
      return { success: true }; // Non-critical
    }

    return { success: true, progressionId: data };
  } catch (err) {
    console.error('[SkillClustering] Error logging cross-game progression:', err);
    return { success: false, error: 'Database error' };
  }
};

/**
 * Get recommended games for a player
 */
export const getRecommendedGames = async (
  supabase: SupabaseClient,
  playerId: string,
  currentGameId?: string,
  limit: number = 5
): Promise<RelatedGameRecommendation[]> => {
  try {
    const { data, error } = await supabase.rpc('get_recommended_games', {
      p_player_id: playerId,
      p_current_game_id: currentGameId || null,
      p_limit: limit,
    });

    if (error) {
      console.warn('[SkillClustering] get_recommended_games RPC failed:', error.message);
      return await getRecommendedGamesFallback(supabase, playerId, currentGameId, limit);
    }

    return (data ?? []).map((row: any) => ({
      gameId: row.game_id,
      gameTitle: row.game_title,
      skillCategory: row.skill_category,
      difficulty: row.difficulty,
      reason: row.recommendation_reason,
      similarityScore: row.similarity_score,
      priority: row.priority,
    }));
  } catch (err) {
    console.error('[SkillClustering] Error getting recommended games:', err);
    return [];
  }
};

/**
 * Fallback for game recommendations
 */
const getRecommendedGamesFallback = async (
  supabase: SupabaseClient,
  playerId: string,
  currentGameId?: string,
  limit: number = 5
): Promise<RelatedGameRecommendation[]> => {
  try {
    // If we have a current game, recommend similar games
    if (currentGameId) {
      const similarGames = await findSimilarGames(supabase, currentGameId, { limit });
      return similarGames.map((g, idx) => ({
        gameId: g.gameId,
        gameTitle: g.gameTitle,
        skillCategory: g.skillCategory,
        difficulty: g.difficulty,
        reason: 'Similar to current game',
        similarityScore: g.similarity,
        priority: idx + 1,
      }));
    }

    // Otherwise, just return a sampling of available games
    const { data: games } = await supabase
      .from('game_embeddings')
      .select('game_id, game_title, skill_category, difficulty')
      .limit(limit);

    return (games ?? []).map((g: any, idx: number) => ({
      gameId: g.game_id,
      gameTitle: g.game_title,
      skillCategory: g.skill_category,
      difficulty: g.difficulty,
      reason: 'Recommended for skill building',
      similarityScore: 0.5,
      priority: idx + 1,
    }));
  } catch (err) {
    console.error('[SkillClustering] Fallback recommendations failed:', err);
    return [];
  }
};

// ============================================================================
// Cross-Game Progression Analysis
// ============================================================================

/**
 * Analyze skill progression across related games
 */
export const analyzeClusterProgression = async (
  supabase: SupabaseClient,
  playerId: string,
  currentGameId: string,
  currentScore: number
): Promise<ClusterAnalysis> => {
  // Get similar games
  const relatedGames = await findSimilarGames(supabase, currentGameId, { limit: 10 });

  // Get player's cluster progress
  const allProgress = await getPlayerClusterProgress(supabase, playerId);

  // Find the cluster containing this game
  let clusterProgress: PlayerClusterProgress | null = null;
  let clusterId = '';
  let clusterName = '';

  for (const progress of allProgress) {
    // For now, match by skill category
    const matchingGame = relatedGames.find(g => g.skillCategory === progress.primarySkill);
    if (matchingGame) {
      clusterProgress = progress;
      clusterId = progress.clusterId;
      clusterName = progress.clusterName;
      break;
    }
  }

  // Generate insights
  const insights = generateProgressionInsights(
    currentScore,
    relatedGames,
    clusterProgress
  );

  // Get recommendations
  const recommendations = await getRecommendedGames(supabase, playerId, currentGameId, 3);

  return {
    clusterId,
    clusterName,
    progress: clusterProgress,
    relatedGames,
    insights,
    recommendations,
  };
};

/**
 * Generate skill progression insights
 */
const generateProgressionInsights = (
  currentScore: number,
  relatedGames: SimilarGame[],
  clusterProgress: PlayerClusterProgress | null
): SkillProgressionInsight[] => {
  const insights: SkillProgressionInsight[] = [];
  const { scoreThresholds } = CLUSTERING_CONFIG;

  // Mastery insight
  if (currentScore >= scoreThresholds.mastery) {
    insights.push({
      type: 'mastery',
      title: 'Skill Mastery',
      message: `Excellent! Your score of ${currentScore} shows strong mastery in this skill area.`,
      relatedGames: relatedGames.slice(0, 3).map(g => g.gameId),
      metrics: { currentScore },
    });
  }

  // Cluster progress insight
  if (clusterProgress) {
    if (clusterProgress.scoreTrend === 'improving') {
      insights.push({
        type: 'improvement',
        title: 'Skill Growth',
        message: `You're improving in ${clusterProgress.primarySkill} games! Your average has increased by ${clusterProgress.improvementRate.toFixed(0)}%.`,
        relatedGames: [],
        metrics: {
          improvementPercent: clusterProgress.improvementRate,
          clusterAvg: clusterProgress.avgScore,
        },
      });
    } else if (clusterProgress.scoreTrend === 'declining' && clusterProgress.gamesPlayed >= 3) {
      insights.push({
        type: 'struggle',
        title: 'Area for Focus',
        message: `Your recent ${clusterProgress.primarySkill} scores are lower than usual. Consider reviewing fundamentals.`,
        relatedGames: [],
        metrics: {
          clusterAvg: clusterProgress.avgScore,
          previousScore: clusterProgress.bestScore,
          currentScore,
        },
      });
    }

    // Progress toward completion
    if (clusterProgress.completionRate < 1 && clusterProgress.completionRate > 0) {
      const remaining = clusterProgress.totalGames - clusterProgress.gamesPlayed;
      insights.push({
        type: 'recommendation',
        title: 'Cluster Progress',
        message: `You've completed ${clusterProgress.gamesPlayed}/${clusterProgress.totalGames} games in this skill cluster. ${remaining} more to go!`,
        relatedGames: relatedGames.filter(g => g.skillCategory === clusterProgress.primarySkill).map(g => g.gameId),
      });
    }
  }

  // Skill transfer insight based on related games
  const prerequisiteGames = relatedGames.filter(g => g.relationshipType === 'prerequisite');
  if (prerequisiteGames.length > 0 && currentScore < scoreThresholds.proficient) {
    insights.push({
      type: 'recommendation',
      title: 'Build Foundation First',
      message: `Consider trying some easier related games to build your foundational skills.`,
      relatedGames: prerequisiteGames.slice(0, 2).map(g => g.gameId),
    });
  }

  // Advanced games suggestion for high performers
  const advancedGames = relatedGames.filter(g => g.relationshipType === 'advanced');
  if (advancedGames.length > 0 && currentScore >= scoreThresholds.proficient) {
    insights.push({
      type: 'recommendation',
      title: 'Ready for More Challenge',
      message: `Great performance! Try some more advanced games in this area.`,
      relatedGames: advancedGames.slice(0, 2).map(g => g.gameId),
    });
  }

  return insights;
};

// ============================================================================
// Feedback Formatting
// ============================================================================

/**
 * Format skill clustering insights as HTML for player feedback
 */
export const formatClusteringFeedback = (
  analysis: ClusterAnalysis,
  currentGameTitle: string
): string => {
  const parts: string[] = [];

  // Related games section
  if (analysis.relatedGames.length > 0) {
    const relatedList = analysis.relatedGames.slice(0, 3).map(g => {
      const simPercent = Math.round(g.similarity * 100);
      const relationIcon = getRelationshipIcon(g.relationshipType);
      return `<li>${relationIcon} <strong>${g.gameTitle}</strong> - ${simPercent}% similar (${g.relationshipType})</li>`;
    }).join('');

    parts.push(`
<details style="background:#0b1220;padding:10px;border-radius:8px;border:1px solid #1e3a5f;margin-bottom:10px;">
  <summary style="cursor:pointer;color:#60a5fa;"><strong>Related Games</strong> (${analysis.relatedGames.length} found)</summary>
  <p style="margin-top:8px;font-size:0.9em;color:#94a3b8;">Games with similar skills that can help you improve:</p>
  <ul style="margin:8px 0;padding-left:20px;font-size:0.9em;">
    ${relatedList}
  </ul>
</details>`);
  }

  // Cluster progress section
  if (analysis.progress) {
    const trendIcon = getTrendIcon(analysis.progress.scoreTrend);
    const trendColor = getTrendColor(analysis.progress.scoreTrend);
    const completionPercent = Math.round(analysis.progress.completionRate * 100);

    parts.push(`
<div style="background:#0f172a;padding:10px;border-radius:8px;border:1px solid #334155;margin-bottom:10px;">
  <p><strong>Your ${analysis.progress.primarySkill} Skill Progress</strong></p>
  <ul style="margin:8px 0;padding-left:20px;font-size:0.9em;">
    <li>Games completed: <strong>${analysis.progress.gamesPlayed}/${analysis.progress.totalGames}</strong> (${completionPercent}%)</li>
    <li>Average score: <strong>${analysis.progress.avgScore.toFixed(0)}</strong> | Best: <strong>${analysis.progress.bestScore}</strong></li>
    <li style="color:${trendColor};">${trendIcon} Trend: <strong>${analysis.progress.scoreTrend}</strong> ${analysis.progress.improvementRate !== 0 ? `(${analysis.progress.improvementRate > 0 ? '+' : ''}${analysis.progress.improvementRate.toFixed(0)}%)` : ''}</li>
  </ul>
</div>`);
  }

  // Insights section
  if (analysis.insights.length > 0) {
    const insightItems = analysis.insights.map(insight => {
      const icon = getInsightIcon(insight.type);
      const bgColor = getInsightBgColor(insight.type);
      const borderColor = getInsightBorderColor(insight.type);

      return `
<div style="background:${bgColor};padding:8px 12px;border-radius:6px;border-left:3px solid ${borderColor};margin-bottom:6px;">
  <p style="margin:0;"><strong>${icon} ${insight.title}</strong></p>
  <p style="margin:4px 0 0;font-size:0.9em;color:#e2e8f0;">${insight.message}</p>
</div>`;
    }).join('');

    parts.push(`
<div style="margin-bottom:10px;">
  <p style="color:#a78bfa;font-size:0.9em;margin-bottom:6px;"><strong>Skill Progression Insights</strong></p>
  ${insightItems}
</div>`);
  }

  // Recommendations section
  if (analysis.recommendations.length > 0) {
    const recList = analysis.recommendations.map((rec, idx) => {
      const priorityBadge = idx === 0 ? '⭐' : '';
      return `<li>${priorityBadge} <strong>${rec.gameTitle}</strong> - ${rec.reason}</li>`;
    }).join('');

    parts.push(`
<details style="background:#0a1a2e;padding:10px;border-radius:8px;border:1px solid #2563eb;margin-bottom:10px;">
  <summary style="cursor:pointer;color:#93c5fd;"><strong>Recommended Next Games</strong></summary>
  <ul style="margin:8px 0;padding-left:20px;font-size:0.9em;">
    ${recList}
  </ul>
</details>`);
  }

  return parts.join('');
};

// ============================================================================
// Helper Functions for Formatting
// ============================================================================

const getRelationshipIcon = (type: string): string => {
  switch (type) {
    case 'prerequisite': return '📚';
    case 'advanced': return '🎯';
    case 'parallel': return '↔️';
    case 'variation': return '🔄';
    default: return '🔗';
  }
};

const getTrendIcon = (trend: string): string => {
  switch (trend) {
    case 'improving': return '📈';
    case 'declining': return '📉';
    case 'stable': return '➡️';
    default: return '🆕';
  }
};

const getTrendColor = (trend: string): string => {
  switch (trend) {
    case 'improving': return '#22c55e';
    case 'declining': return '#f97316';
    case 'stable': return '#64748b';
    default: return '#60a5fa';
  }
};

const getInsightIcon = (type: string): string => {
  switch (type) {
    case 'mastery': return '🏆';
    case 'improvement': return '📈';
    case 'struggle': return '💪';
    case 'skill_transfer': return '🔄';
    case 'recommendation': return '💡';
    default: return '📊';
  }
};

const getInsightBgColor = (type: string): string => {
  switch (type) {
    case 'mastery': return '#052e16';
    case 'improvement': return '#052e16';
    case 'struggle': return '#3f0a0a';
    case 'skill_transfer': return '#1e1b4b';
    case 'recommendation': return '#0f3460';
    default: return '#0f172a';
  }
};

const getInsightBorderColor = (type: string): string => {
  switch (type) {
    case 'mastery': return '#22c55e';
    case 'improvement': return '#22c55e';
    case 'struggle': return '#ef4444';
    case 'skill_transfer': return '#8b5cf6';
    case 'recommendation': return '#3b82f6';
    default: return '#64748b';
  }
};

// ============================================================================
// Batch Operations (for admin/cron jobs)
// ============================================================================

/**
 * Recompute all game similarity pairs
 */
export const recomputeGameSimilarities = async (
  supabase: SupabaseClient
): Promise<{ success: boolean; pairsComputed: number; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('compute_game_similarity_batch');

    if (error) {
      console.error('[SkillClustering] compute_game_similarity_batch failed:', error);
      return { success: false, pairsComputed: 0, error: error.message };
    }

    // Invalidate cache
    similarityCache = null;

    return { success: true, pairsComputed: data || 0 };
  } catch (err) {
    console.error('[SkillClustering] Exception recomputing similarities:', err);
    return { success: false, pairsComputed: 0, error: 'Database error' };
  }
};

/**
 * Create initial clusters from games
 */
export const initializeClusters = async (
  supabase: SupabaseClient,
  games: Game[]
): Promise<{ success: boolean; clustersCreated: number; error?: string }> => {
  try {
    let clustersCreated = 0;

    // Group games by skill category
    const bySkill = new Map<string, Game[]>();
    for (const game of games) {
      const existing = bySkill.get(game.skillCategory) || [];
      existing.push(game);
      bySkill.set(game.skillCategory, existing);
    }

    // Create cluster for each skill category
    for (const [skill, skillGames] of bySkill.entries()) {
      const gameIds = skillGames.map(g => g.id);
      const avgDifficulty = skillGames.reduce((sum, g) => {
        return sum + difficultyToNumber(g.difficulty);
      }, 0) / skillGames.length;

      const { error } = await supabase
        .from('game_clusters')
        .upsert({
          cluster_name: `${skill.charAt(0).toUpperCase() + skill.slice(1)} Skills`,
          cluster_type: 'skill',
          game_ids: gameIds,
          primary_skill: skill,
          avg_difficulty: avgDifficulty,
          game_count: skillGames.length,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'cluster_name',
        });

      if (!error) {
        clustersCreated++;
      }
    }

    return { success: true, clustersCreated };
  } catch (err) {
    console.error('[SkillClustering] Error initializing clusters:', err);
    return { success: false, clustersCreated: 0, error: 'Database error' };
  }
};

export default {
  // Core functions
  calculateGameSimilarity,
  determineRelationship,

  // Database operations
  storeGameEmbedding,
  findSimilarGames,
  getPlayerClusterProgress,
  updatePlayerClusterProgress,
  logCrossGameProgression,
  getRecommendedGames,

  // Analysis
  analyzeClusterProgression,
  formatClusteringFeedback,

  // Batch operations
  recomputeGameSimilarities,
  initializeClusters,

  // Config
  CLUSTERING_CONFIG,
};
