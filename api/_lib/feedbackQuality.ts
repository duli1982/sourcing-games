/**
 * Feedback Quality Monitoring Service
 *
 * Tracks which feedback leads to improved subsequent attempts.
 * Uses this data to refine AI prompts and RAG content.
 *
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { SkillCategory } from '../../types.js';

// ============================================================================
// Types
// ============================================================================

export type FeedbackType =
  | 'ai_generated'
  | 'validation'
  | 'peer_comparison'
  | 'personalized'
  | 'rag_enhanced'
  | 'difficulty_adaptive';

export type EffectivenessRating =
  | 'highly_effective'
  | 'effective'
  | 'neutral'
  | 'ineffective'
  | 'counterproductive';

export interface FeedbackComponents {
  aiGenerated?: string;
  validation?: string;
  peerComparison?: string;
  personalized?: string;
  ragEnhanced?: string;
  difficultyAdaptive?: string;
  gamingWarning?: string;
  calibrationNote?: string;
}

export interface FeedbackRecord {
  feedbackId: string;
  playerId: string;
  gameId: string;
  skillCategory: SkillCategory;
  originalAttemptId: string;
  originalScore: number;
  originalTimestamp: string;
  feedbackText: string;
  feedbackType: FeedbackType;
  feedbackComponents: FeedbackComponents;
  improvementSuggestions: string[];
  strengthsMentioned: string[];
  weaknessesIdentified: string[];
  ragArticlesUsed?: string[];
  ragChunksUsed?: string[];
  promptVersion: string;
  scoringVersion: string;
}

export interface FollowupResult {
  feedbackId: string;
  originalScore: number;
  followupScore: number;
  scoreImprovement: number;
  improvementPercentage: number;
  effectiveness: EffectivenessRating;
  wasLinked: boolean;
  timeToFollowupMs?: number;
  wasImmediateRetry: boolean;
}

export interface FeedbackEffectivenessStats {
  feedbackType: FeedbackType;
  skillCategory?: SkillCategory;
  timesUsed: number;
  timesFollowedUp: number;
  followupRate: number;
  avgScoreImprovement: number;
  positiveImprovementRate: number;
  negativeImprovementRate: number;
  effectivenessRating: EffectivenessRating;
  confidence: number;
}

export interface SuggestionEffectiveness {
  suggestionText: string;
  suggestionCategory: string;
  timesGiven: number;
  timesFollowed: number;
  avgImprovement: number;
  positiveRate: number;
  effectivenessScore: number;
  isEffective: boolean;
}

export interface FeedbackQualityReport {
  totalFeedback: number;
  followupRate: number;
  avgImprovement: number;
  positiveRate: number;
  mostEffectiveType: FeedbackType | null;
  leastEffectiveType: FeedbackType | null;
  needsAttentionCount: number;
  byFeedbackType: FeedbackEffectivenessStats[];
  bySkillCategory: FeedbackEffectivenessStats[];
  topSuggestions: SuggestionEffectiveness[];
  underperformingSuggestions: SuggestionEffectiveness[];
}

// ============================================================================
// Configuration
// ============================================================================

export const FEEDBACK_QUALITY_CONFIG = {
  // Effectiveness thresholds
  effectivenessThresholds: {
    highlyEffective: 20, // +20 points improvement
    effective: 10, // +10 points
    neutral: 0, // 0 points
    ineffective: -10, // -10 points
    // Below -10 is counterproductive
  },

  // Minimum samples for confidence
  minSamplesForConfidence: {
    low: 5,
    medium: 20,
    high: 50,
  },

  // Time thresholds
  immediateRetryThresholdMs: 5 * 60 * 1000, // 5 minutes
  maxFollowupWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Suggestion extraction patterns
  suggestionPatterns: [
    /try\s+(?:to\s+)?([^.!?]+)/gi,
    /consider\s+([^.!?]+)/gi,
    /improve\s+(?:your\s+)?([^.!?]+)/gi,
    /focus\s+on\s+([^.!?]+)/gi,
    /add\s+(?:more\s+)?([^.!?]+)/gi,
    /include\s+([^.!?]+)/gi,
    /make\s+sure\s+(?:to\s+)?([^.!?]+)/gi,
  ],
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Records feedback given for an attempt
 */
export const recordFeedback = async (
  supabase: SupabaseClient,
  record: FeedbackRecord
): Promise<{ success: boolean; feedbackId?: string; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('feedback_attempts')
      .insert({
        feedback_id: record.feedbackId,
        player_id: record.playerId,
        game_id: record.gameId,
        skill_category: record.skillCategory,
        original_attempt_id: record.originalAttemptId,
        original_score: record.originalScore,
        original_timestamp: record.originalTimestamp,
        feedback_text: record.feedbackText,
        feedback_type: record.feedbackType,
        feedback_components: record.feedbackComponents,
        improvement_suggestions: record.improvementSuggestions,
        strengths_mentioned: record.strengthsMentioned,
        weaknesses_identified: record.weaknessesIdentified,
        rag_articles_used: record.ragArticlesUsed,
        rag_chunks_used: record.ragChunksUsed,
        prompt_version: record.promptVersion,
        scoring_version: record.scoringVersion,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to record feedback:', error);
      return { success: false, error: error.message };
    }

    return { success: true, feedbackId: data.id };
  } catch (err) {
    console.warn('Feedback recording exception:', err);
    return { success: false, error: String(err) };
  }
};

/**
 * Links a followup attempt to previous feedback
 */
export const linkFollowupAttempt = async (
  supabase: SupabaseClient,
  playerId: string,
  gameId: string,
  attemptId: string,
  score: number
): Promise<FollowupResult | null> => {
  try {
    const { data, error } = await supabase.rpc('link_followup_attempt', {
      p_player_id: playerId,
      p_game_id: gameId,
      p_attempt_id: attemptId,
      p_score: score,
    });

    if (error || !data || data.length === 0 || !data[0].was_linked) {
      return null;
    }

    const result = data[0];
    const improvement = result.score_improvement;

    return {
      feedbackId: result.feedback_id,
      originalScore: result.original_score,
      followupScore: score,
      scoreImprovement: improvement,
      improvementPercentage:
        result.original_score > 0 ? (improvement / result.original_score) * 100 : 0,
      effectiveness: determineEffectiveness(improvement),
      wasLinked: true,
      wasImmediateRetry: false, // Will be updated by DB function
    };
  } catch (err) {
    console.warn('Failed to link followup attempt:', err);
    return null;
  }
};

/**
 * Extracts improvement suggestions from feedback text
 */
export const extractSuggestions = (feedbackText: string): string[] => {
  const suggestions: string[] = [];
  const seenSuggestions = new Set<string>();

  for (const pattern of FEEDBACK_QUALITY_CONFIG.suggestionPatterns) {
    const matches = feedbackText.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const suggestion = match[1].trim().toLowerCase();
        // Dedupe and filter short suggestions
        if (suggestion.length > 10 && !seenSuggestions.has(suggestion)) {
          seenSuggestions.add(suggestion);
          suggestions.push(match[1].trim());
        }
      }
    }
  }

  return suggestions.slice(0, 10); // Limit to 10 suggestions
};

/**
 * Extracts strengths mentioned in feedback
 */
export const extractStrengths = (feedbackText: string): string[] => {
  const strengths: string[] = [];
  const patterns = [
    /(?:excellent|great|good|strong|well[- ]done|nice)\s+(?:use\s+of\s+|work\s+(?:on|with)\s+)?([^.!?]+)/gi,
    /strengths?:?\s*([^.!?]+)/gi,
    /you\s+(?:did|have)\s+(?:a\s+)?(?:great|good|excellent)\s+job\s+(?:with|on)\s+([^.!?]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = feedbackText.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 5) {
        strengths.push(match[1].trim());
      }
    }
  }

  return [...new Set(strengths)].slice(0, 5);
};

/**
 * Extracts weaknesses/areas for improvement
 */
export const extractWeaknesses = (feedbackText: string): string[] => {
  const weaknesses: string[] = [];
  const patterns = [
    /(?:missing|lacks?|needs?|weak|could\s+improve)\s+([^.!?]+)/gi,
    /(?:areas?\s+for\s+improvement|weaknesses?):?\s*([^.!?]+)/gi,
    /(?:didn't|did\s+not|failed\s+to)\s+([^.!?]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = feedbackText.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 5) {
        weaknesses.push(match[1].trim());
      }
    }
  }

  return [...new Set(weaknesses)].slice(0, 5);
};

/**
 * Determines the primary feedback type from components
 */
export const determineFeedbackType = (components: FeedbackComponents): FeedbackType => {
  if (components.ragEnhanced) return 'rag_enhanced';
  if (components.personalized) return 'personalized';
  if (components.peerComparison) return 'peer_comparison';
  if (components.difficultyAdaptive) return 'difficulty_adaptive';
  if (components.aiGenerated) return 'ai_generated';
  return 'validation';
};

/**
 * Determines effectiveness rating from score improvement
 */
export const determineEffectiveness = (improvement: number): EffectivenessRating => {
  const thresholds = FEEDBACK_QUALITY_CONFIG.effectivenessThresholds;
  if (improvement >= thresholds.highlyEffective) return 'highly_effective';
  if (improvement >= thresholds.effective) return 'effective';
  if (improvement >= thresholds.neutral) return 'neutral';
  if (improvement >= thresholds.ineffective) return 'ineffective';
  return 'counterproductive';
};

// ============================================================================
// Analytics Functions
// ============================================================================

/**
 * Gets feedback effectiveness statistics
 */
export const getFeedbackEffectivenessStats = async (
  supabase: SupabaseClient,
  options: {
    feedbackType?: FeedbackType;
    skillCategory?: SkillCategory;
    days?: number;
  } = {}
): Promise<FeedbackEffectivenessStats[]> => {
  try {
    let query = supabase
      .from('feedback_patterns')
      .select('*')
      .eq('pattern_type', 'feedback_type');

    if (options.skillCategory) {
      query = query.eq('skill_category', options.skillCategory);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      feedbackType: row.pattern_value as FeedbackType,
      skillCategory: row.skill_category,
      timesUsed: row.times_used,
      timesFollowedUp: row.times_followed_up,
      followupRate: row.followup_rate || 0,
      avgScoreImprovement: row.avg_score_improvement || 0,
      positiveImprovementRate: row.positive_improvement_rate || 0,
      negativeImprovementRate: row.negative_improvement_rate || 0,
      effectivenessRating: row.effectiveness_rating as EffectivenessRating,
      confidence: row.confidence_level || 0,
    }));
  } catch (err) {
    console.warn('Failed to get feedback effectiveness stats:', err);
    return [];
  }
};

/**
 * Gets most effective suggestions for a skill category
 */
export const getEffectiveSuggestions = async (
  supabase: SupabaseClient,
  skillCategory: SkillCategory,
  scoreRange?: 'low' | 'medium' | 'high',
  limit: number = 5
): Promise<SuggestionEffectiveness[]> => {
  try {
    const { data, error } = await supabase.rpc('get_effective_suggestions', {
      p_skill_category: skillCategory,
      p_score_range: scoreRange || null,
      p_limit: limit,
    });

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      suggestionText: row.suggestion_text,
      suggestionCategory: 'general',
      timesGiven: row.times_effective,
      timesFollowed: row.times_effective,
      avgImprovement: row.avg_improvement || 0,
      positiveRate: 1.0, // Only effective suggestions returned
      effectivenessScore: row.effectiveness_score || 0,
      isEffective: true,
    }));
  } catch (err) {
    console.warn('Failed to get effective suggestions:', err);
    return [];
  }
};

/**
 * Gets underperforming suggestions that need review
 */
export const getUnderperformingSuggestions = async (
  supabase: SupabaseClient,
  limit: number = 10
): Promise<SuggestionEffectiveness[]> => {
  try {
    const { data, error } = await supabase
      .from('suggestion_effectiveness')
      .select('*')
      .eq('is_effective', false)
      .gte('times_followed', 3)
      .order('effectiveness_score', { ascending: true })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      suggestionText: row.suggestion_text,
      suggestionCategory: row.suggestion_category,
      timesGiven: row.times_given,
      timesFollowed: row.times_followed,
      avgImprovement: row.avg_improvement || 0,
      positiveRate: row.positive_rate || 0,
      effectivenessScore: row.effectiveness_score || 0,
      isEffective: false,
    }));
  } catch (err) {
    console.warn('Failed to get underperforming suggestions:', err);
    return [];
  }
};

/**
 * Generates comprehensive feedback quality report
 */
export const getFeedbackQualityReport = async (
  supabase: SupabaseClient,
  days: number = 30
): Promise<FeedbackQualityReport | null> => {
  try {
    const { data, error } = await supabase.rpc('get_feedback_quality_report', {
      p_days: days,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const reportData = data[0];

    // Get additional breakdown data
    const [byType, byCategoryResults, topSuggestions, underperforming] = await Promise.all([
      getFeedbackEffectivenessStats(supabase),
      getFeedbackEffectivenessStats(supabase),
      supabase
        .from('suggestion_effectiveness')
        .select('*')
        .eq('is_effective', true)
        .order('effectiveness_score', { ascending: false })
        .limit(5),
      getUnderperformingSuggestions(supabase, 5),
    ]);

    return {
      totalFeedback: reportData.total_feedback || 0,
      followupRate: reportData.followup_rate || 0,
      avgImprovement: reportData.avg_improvement || 0,
      positiveRate: reportData.positive_rate || 0,
      mostEffectiveType: reportData.most_effective_type as FeedbackType | null,
      leastEffectiveType: reportData.least_effective_type as FeedbackType | null,
      needsAttentionCount: reportData.needs_attention_count || 0,
      byFeedbackType: byType,
      bySkillCategory: byCategoryResults,
      topSuggestions: topSuggestions.data?.map((row: any) => ({
        suggestionText: row.suggestion_text,
        suggestionCategory: row.suggestion_category,
        timesGiven: row.times_given,
        timesFollowed: row.times_followed,
        avgImprovement: row.avg_improvement || 0,
        positiveRate: row.positive_rate || 0,
        effectivenessScore: row.effectiveness_score || 0,
        isEffective: true,
      })) || [],
      underperformingSuggestions: underperforming,
    };
  } catch (err) {
    console.warn('Failed to get feedback quality report:', err);
    return null;
  }
};

/**
 * Updates RAG content effectiveness
 */
export const updateRagContentEffectiveness = async (
  supabase: SupabaseClient,
  contentType: 'article' | 'chunk',
  contentId: string,
  skillCategory: SkillCategory,
  wasFollowedUp: boolean,
  scoreImprovement?: number
): Promise<void> => {
  try {
    // Upsert effectiveness record
    const { error } = await supabase
      .from('rag_content_effectiveness')
      .upsert(
        {
          content_type: contentType,
          content_id: contentId,
          skill_category: skillCategory,
          times_used: 1,
          times_led_to_followup: wasFollowedUp ? 1 : 0,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'content_type,content_id,skill_category,difficulty',
        }
      );

    if (error) {
      console.warn('Failed to update RAG content effectiveness:', error);
    }
  } catch (err) {
    console.warn('RAG effectiveness update exception:', err);
  }
};

/**
 * Gets prioritized RAG content for a skill category
 */
export const getPrioritizedRagContent = async (
  supabase: SupabaseClient,
  skillCategory: SkillCategory,
  limit: number = 5
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('rag_content_effectiveness')
      .select('content_id')
      .eq('skill_category', skillCategory)
      .eq('should_prioritize', true)
      .order('avg_improvement_when_used', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => row.content_id);
  } catch (err) {
    return [];
  }
};

// ============================================================================
// Batch Update Functions
// ============================================================================

/**
 * Updates all feedback pattern statistics
 */
export const updateFeedbackPatterns = async (supabase: SupabaseClient): Promise<void> => {
  try {
    await supabase.rpc('update_feedback_patterns');
  } catch (err) {
    console.warn('Failed to update feedback patterns:', err);
  }
};

/**
 * Creates a daily feedback quality summary
 */
export const createDailySummary = async (
  supabase: SupabaseClient,
  date: Date = new Date()
): Promise<void> => {
  try {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    // Get daily statistics
    const { data: stats } = await supabase
      .from('feedback_attempts')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());

    if (!stats || stats.length === 0) return;

    const totalFeedback = stats.length;
    const withFollowup = stats.filter((s: any) => s.has_followup_attempt);
    const improvements = withFollowup.map((s: any) => s.score_improvement || 0);

    const positiveCount = improvements.filter((i: number) => i > 0).length;
    const negativeCount = improvements.filter((i: number) => i < 0).length;
    const avgImprovement =
      improvements.length > 0 ? improvements.reduce((a: number, b: number) => a + b, 0) / improvements.length : 0;

    await supabase.from('feedback_quality_summary').insert({
      period_type: 'daily',
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      total_feedback_given: totalFeedback,
      total_followup_attempts: withFollowup.length,
      followup_rate: withFollowup.length / totalFeedback,
      avg_score_improvement: avgImprovement,
      positive_improvement_count: positiveCount,
      negative_improvement_count: negativeCount,
      no_change_count: improvements.filter((i: number) => i === 0).length,
      positive_improvement_rate: withFollowup.length > 0 ? positiveCount / withFollowup.length : 0,
    });
  } catch (err) {
    console.warn('Failed to create daily summary:', err);
  }
};

// ============================================================================
// Helper for Integration
// ============================================================================

/**
 * Creates a feedback record from scoring result
 * Call this after generating feedback in submitAttempt
 */
export const createFeedbackRecordFromScoring = (
  playerId: string,
  gameId: string,
  skillCategory: SkillCategory,
  attemptId: string,
  score: number,
  feedbackText: string,
  components: FeedbackComponents,
  ragArticles?: string[],
  ragChunks?: string[],
  scoringVersion: string = '2.8.0'
): FeedbackRecord => {
  return {
    feedbackId: `${playerId}_${gameId}_${Date.now()}`,
    playerId,
    gameId,
    skillCategory,
    originalAttemptId: attemptId,
    originalScore: score,
    originalTimestamp: new Date().toISOString(),
    feedbackText,
    feedbackType: determineFeedbackType(components),
    feedbackComponents: components,
    improvementSuggestions: extractSuggestions(feedbackText),
    strengthsMentioned: extractStrengths(feedbackText),
    weaknessesIdentified: extractWeaknesses(feedbackText),
    ragArticlesUsed: ragArticles,
    ragChunksUsed: ragChunks,
    promptVersion: 'v1',
    scoringVersion,
  };
};
