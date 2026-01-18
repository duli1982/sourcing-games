/**
 * Enhanced Anti-Gaming Detection Service
 *
 * Detects sophisticated gaming attempts including:
 * - Keyword stuffing
 * - Template copying
 * - AI-generated submissions
 * - Pattern gaming
 * - Cross-submission analysis
 *
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { SkillCategory } from '../../types.js';

// ============================================================================
// Types
// ============================================================================

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface GamingDetectionResult {
  overallRisk: RiskLevel;
  riskScore: number; // 0-100

  // Individual detection scores (0-100)
  scores: {
    keywordStuffing: number;
    templateMatch: number;
    aiGenerated: number;
    copyPaste: number;
    lowEffort: number;
    patternGaming: number;
  };

  // What triggered the detection
  flags: string[];

  // Detailed signals for debugging/analysis
  signals: GamingSignals;

  // Recommended action
  recommendedAction: 'allow' | 'warn' | 'penalize' | 'flag_review' | 'reject';
  scorePenalty: number;
}

export interface GamingSignals {
  // Keyword stuffing signals
  keywordDensity: number;
  uniqueWordRatio: number;
  repeatedKeywords: string[];
  suspiciousKeywordPatterns: boolean;

  // Template signals
  templateMatchFound: boolean;
  templateMatchSimilarity: number;
  matchedTemplateType?: string;

  // AI detection signals
  aiPhraseCount: number;
  aiPhraseScore: number;
  formalityScore: number;
  structuralPatterns: string[];
  sentenceVariety: number;
  burstinessScore: number; // AI tends to have uniform sentence lengths

  // Copy/paste signals
  exampleSimilarity: number;
  crossSubmissionSimilarity: number;
  commonPhraseRatio: number;

  // Low effort signals
  wordCount: number;
  avgSentenceLength: number;
  hasPlaceholders: boolean;
  isIncomplete: boolean;

  // Pattern gaming signals
  submissionVelocity: number; // Submissions per hour for this player
  consistentScorePattern: boolean;
  suspiciousTimingPattern: boolean;
}

export interface DetectionContext {
  playerId: string;
  gameId: string;
  skillCategory: SkillCategory;
  exampleSolution?: string;
  submissionTimeMs?: number;
  playerHistory?: {
    totalSubmissions: number;
    avgScore: number;
    recentScores: number[];
  };
}

// ============================================================================
// Configuration
// ============================================================================

export const GAMING_CONFIG = {
  // Risk thresholds
  riskThresholds: {
    low: 20,
    medium: 40,
    high: 60,
    critical: 80,
  },

  // Score penalties by risk level
  penalties: {
    none: 0,
    low: 0,
    medium: 5,
    high: 15,
    critical: 30,
  },

  // Keyword stuffing thresholds
  keywordStuffing: {
    warningDensity: 0.15, // 15% keyword density
    criticalDensity: 0.25, // 25% keyword density
    maxRepetitions: 5, // Same keyword more than 5 times
  },

  // AI detection thresholds
  aiDetection: {
    phrasesForWarning: 3,
    phrasesForCritical: 6,
    minFormalityScore: 0.7, // Suspiciously formal
    burstinessThreshold: 0.3, // Low variance in sentence length
  },

  // Template matching
  templateMatch: {
    similarityWarning: 0.85,
    similarityCritical: 0.95,
  },

  // Low effort thresholds
  lowEffort: {
    minWordCount: 20,
    minSentenceLength: 5,
  },
};

// Common AI phrases to detect
const AI_PHRASES = [
  // Formal transitions
  { phrase: 'in conclusion', weight: 0.3, confidence: 0.6 },
  { phrase: 'furthermore', weight: 0.2, confidence: 0.5 },
  { phrase: 'moreover', weight: 0.2, confidence: 0.5 },
  { phrase: 'additionally', weight: 0.2, confidence: 0.5 },
  { phrase: 'it is worth noting', weight: 0.3, confidence: 0.6 },
  { phrase: 'it is important to note', weight: 0.3, confidence: 0.6 },
  { phrase: 'it should be noted', weight: 0.3, confidence: 0.6 },
  { phrase: 'firstly', weight: 0.2, confidence: 0.5 },
  { phrase: 'secondly', weight: 0.2, confidence: 0.5 },
  { phrase: 'thirdly', weight: 0.2, confidence: 0.5 },
  { phrase: 'lastly', weight: 0.2, confidence: 0.5 },

  // Hedging language
  { phrase: 'may or may not', weight: 0.2, confidence: 0.5 },
  { phrase: 'it could be argued', weight: 0.3, confidence: 0.6 },
  { phrase: 'one might consider', weight: 0.3, confidence: 0.6 },
  { phrase: 'it can be said', weight: 0.3, confidence: 0.6 },

  // Generic acknowledgments (strong AI signals)
  { phrase: 'great question', weight: 0.5, confidence: 0.7 },
  { phrase: 'that\'s a great question', weight: 0.5, confidence: 0.7 },
  { phrase: 'thank you for asking', weight: 0.4, confidence: 0.6 },
  { phrase: 'excellent question', weight: 0.5, confidence: 0.7 },

  // AI assistant phrasing
  { phrase: 'i\'d be happy to', weight: 0.4, confidence: 0.7 },
  { phrase: 'i hope this helps', weight: 0.5, confidence: 0.8 },
  { phrase: 'feel free to', weight: 0.3, confidence: 0.5 },
  { phrase: 'let me explain', weight: 0.3, confidence: 0.5 },
  { phrase: 'here are some', weight: 0.2, confidence: 0.4 },
  { phrase: 'here is a', weight: 0.2, confidence: 0.4 },

  // Overly structured language
  { phrase: 'there are several', weight: 0.2, confidence: 0.4 },
  { phrase: 'key points include', weight: 0.3, confidence: 0.5 },
  { phrase: 'important factors', weight: 0.2, confidence: 0.4 },
  { phrase: 'crucial aspects', weight: 0.2, confidence: 0.4 },

  // Meta-commentary
  { phrase: 'as mentioned earlier', weight: 0.2, confidence: 0.4 },
  { phrase: 'as stated above', weight: 0.2, confidence: 0.4 },
  { phrase: 'to summarize', weight: 0.3, confidence: 0.5 },
  { phrase: 'in summary', weight: 0.3, confidence: 0.5 },
];

// Keywords by skill category for stuffing detection
const SKILL_KEYWORDS: Record<string, { primary: string[]; secondary: string[] }> = {
  boolean: {
    primary: ['and', 'or', 'not', 'boolean', 'search', 'operator', 'query'],
    secondary: ['string', 'filter', 'syntax', 'parentheses', 'quotes'],
  },
  xray: {
    primary: ['site:', 'inurl:', 'filetype:', 'google', 'x-ray', 'intitle:'],
    secondary: ['search', 'linkedin', 'resume', 'profile', 'github'],
  },
  linkedin: {
    primary: ['linkedin', 'profile', 'connection', 'inmail', 'recruiter'],
    secondary: ['network', 'search', 'filter', 'talent', 'endorse'],
  },
  outreach: {
    primary: ['email', 'message', 'reach', 'connect', 'response', 'subject'],
    secondary: ['personalize', 'candidate', 'opportunity', 'follow-up'],
  },
  diversity: {
    primary: ['diversity', 'inclusion', 'equity', 'dei', 'underrepresented'],
    secondary: ['bias', 'representation', 'inclusive', 'belonging'],
  },
  persona: {
    primary: ['persona', 'candidate', 'profile', 'ideal', 'requirements'],
    secondary: ['skills', 'experience', 'background', 'qualifications'],
  },
  general: {
    primary: ['sourcing', 'recruiting', 'talent', 'candidate', 'hire'],
    secondary: ['search', 'pipeline', 'strategy', 'outreach'],
  },
};

// ============================================================================
// Core Detection Functions
// ============================================================================

/**
 * Main detection function - runs all checks
 */
export const detectGaming = async (
  submission: string,
  context: DetectionContext,
  supabase?: SupabaseClient
): Promise<GamingDetectionResult> => {
  const normalizedSubmission = submission.toLowerCase().trim();
  const words = normalizedSubmission.split(/\s+/).filter(w => w.length > 0);

  // Initialize signals
  const signals: GamingSignals = {
    keywordDensity: 0,
    uniqueWordRatio: 0,
    repeatedKeywords: [],
    suspiciousKeywordPatterns: false,
    templateMatchFound: false,
    templateMatchSimilarity: 0,
    aiPhraseCount: 0,
    aiPhraseScore: 0,
    formalityScore: 0,
    structuralPatterns: [],
    sentenceVariety: 0,
    burstinessScore: 0,
    exampleSimilarity: 0,
    crossSubmissionSimilarity: 0,
    commonPhraseRatio: 0,
    wordCount: words.length,
    avgSentenceLength: 0,
    hasPlaceholders: false,
    isIncomplete: false,
    submissionVelocity: 0,
    consistentScorePattern: false,
    suspiciousTimingPattern: false,
  };

  const flags: string[] = [];
  const scores = {
    keywordStuffing: 0,
    templateMatch: 0,
    aiGenerated: 0,
    copyPaste: 0,
    lowEffort: 0,
    patternGaming: 0,
  };

  // Run all detection checks
  detectKeywordStuffing(normalizedSubmission, words, context.skillCategory, signals, flags, scores);
  detectAIGenerated(normalizedSubmission, signals, flags, scores);
  detectLowEffort(normalizedSubmission, words, signals, flags, scores);
  detectCopyPaste(normalizedSubmission, context.exampleSolution, signals, flags, scores);

  // Template matching (requires DB)
  if (supabase) {
    await detectTemplateMatch(supabase, normalizedSubmission, context.gameId, signals, flags, scores);
  }

  // Calculate overall risk score (weighted average)
  const riskScore = calculateOverallRiskScore(scores);

  // Determine risk level
  const overallRisk = determineRiskLevel(riskScore);

  // Determine recommended action
  const { recommendedAction, scorePenalty } = determineAction(overallRisk, signals);

  return {
    overallRisk,
    riskScore,
    scores,
    flags,
    signals,
    recommendedAction,
    scorePenalty,
  };
};

/**
 * Detect keyword stuffing
 */
const detectKeywordStuffing = (
  submission: string,
  words: string[],
  skillCategory: SkillCategory,
  signals: GamingSignals,
  flags: string[],
  scores: { keywordStuffing: number }
): void => {
  const keywords = SKILL_KEYWORDS[skillCategory] || SKILL_KEYWORDS.general;
  const allKeywords = [...keywords.primary, ...keywords.secondary];

  // Count keyword occurrences
  const keywordCounts: Record<string, number> = {};
  let totalKeywordOccurrences = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
    if (allKeywords.includes(cleanWord)) {
      keywordCounts[cleanWord] = (keywordCounts[cleanWord] || 0) + 1;
      totalKeywordOccurrences++;
    }
  }

  // Calculate keyword density
  const density = words.length > 0 ? totalKeywordOccurrences / words.length : 0;
  signals.keywordDensity = density;

  // Find repeated keywords
  signals.repeatedKeywords = Object.entries(keywordCounts)
    .filter(([_, count]) => count > GAMING_CONFIG.keywordStuffing.maxRepetitions)
    .map(([keyword]) => keyword);

  // Calculate unique word ratio
  const uniqueWords = new Set(words);
  signals.uniqueWordRatio = words.length > 0 ? uniqueWords.size / words.length : 0;

  // Check for suspicious patterns
  if (density > GAMING_CONFIG.keywordStuffing.criticalDensity) {
    scores.keywordStuffing = 80 + (density - GAMING_CONFIG.keywordStuffing.criticalDensity) * 100;
    signals.suspiciousKeywordPatterns = true;
    flags.push(`Critical keyword stuffing detected (${(density * 100).toFixed(1)}% density)`);
  } else if (density > GAMING_CONFIG.keywordStuffing.warningDensity) {
    scores.keywordStuffing = 40 + (density - GAMING_CONFIG.keywordStuffing.warningDensity) * 200;
    flags.push(`Elevated keyword density (${(density * 100).toFixed(1)}%)`);
  }

  if (signals.repeatedKeywords.length > 0) {
    scores.keywordStuffing = Math.min(100, scores.keywordStuffing + 20);
    flags.push(`Repeated keywords: ${signals.repeatedKeywords.join(', ')}`);
  }

  // Very low unique word ratio is suspicious
  if (signals.uniqueWordRatio < 0.4 && words.length > 30) {
    scores.keywordStuffing = Math.min(100, scores.keywordStuffing + 15);
    flags.push('Low vocabulary diversity');
  }

  scores.keywordStuffing = Math.min(100, Math.max(0, scores.keywordStuffing));
};

/**
 * Detect AI-generated content
 */
const detectAIGenerated = (
  submission: string,
  signals: GamingSignals,
  flags: string[],
  scores: { aiGenerated: number }
): void => {
  const lowerSubmission = submission.toLowerCase();

  // Check for AI phrases
  let totalPhraseScore = 0;
  const foundPhrases: string[] = [];

  for (const { phrase, weight, confidence } of AI_PHRASES) {
    if (lowerSubmission.includes(phrase)) {
      totalPhraseScore += weight * confidence * 100;
      foundPhrases.push(phrase);
    }
  }

  signals.aiPhraseCount = foundPhrases.length;
  signals.aiPhraseScore = Math.min(100, totalPhraseScore);

  // Check sentence variety (AI tends to be uniform)
  const sentences = submission.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length >= 3) {
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) =>
      sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (normalized variance)
    const cv = avgLength > 0 ? stdDev / avgLength : 0;
    signals.burstinessScore = cv;
    signals.avgSentenceLength = avgLength;

    // Low variance in sentence length is suspicious
    if (cv < GAMING_CONFIG.aiDetection.burstinessThreshold && sentences.length >= 5) {
      signals.structuralPatterns.push('uniform_sentence_length');
    }
  }

  // Check formality score
  const formalIndicators = [
    /\b(therefore|thus|hence|consequently|accordingly)\b/gi,
    /\b(shall|ought|must|hereby)\b/gi,
    /\b(aforementioned|hereunder|therein|whereby)\b/gi,
  ];

  let formalityCount = 0;
  for (const pattern of formalIndicators) {
    const matches = submission.match(pattern);
    formalityCount += matches ? matches.length : 0;
  }

  const wordCount = submission.split(/\s+/).length;
  signals.formalityScore = wordCount > 0 ? Math.min(1, formalityCount / (wordCount / 50)) : 0;

  // Calculate AI score
  if (signals.aiPhraseCount >= GAMING_CONFIG.aiDetection.phrasesForCritical) {
    scores.aiGenerated = 70 + signals.aiPhraseScore * 0.3;
    flags.push(`Strong AI-generation indicators (${signals.aiPhraseCount} AI phrases detected)`);
  } else if (signals.aiPhraseCount >= GAMING_CONFIG.aiDetection.phrasesForWarning) {
    scores.aiGenerated = 40 + signals.aiPhraseScore * 0.3;
    flags.push(`Possible AI-generated content (${signals.aiPhraseCount} AI phrases)`);
  }

  if (signals.structuralPatterns.includes('uniform_sentence_length')) {
    scores.aiGenerated = Math.min(100, scores.aiGenerated + 15);
    flags.push('Uniform sentence structure (AI pattern)');
  }

  if (signals.formalityScore > GAMING_CONFIG.aiDetection.minFormalityScore) {
    scores.aiGenerated = Math.min(100, scores.aiGenerated + 10);
    flags.push('Unusually formal language');
  }

  scores.aiGenerated = Math.min(100, Math.max(0, scores.aiGenerated));
};

/**
 * Detect low effort submissions
 */
const detectLowEffort = (
  submission: string,
  words: string[],
  signals: GamingSignals,
  flags: string[],
  scores: { lowEffort: number }
): void => {
  signals.wordCount = words.length;

  // Check word count
  if (words.length < GAMING_CONFIG.lowEffort.minWordCount) {
    scores.lowEffort = 60 + (GAMING_CONFIG.lowEffort.minWordCount - words.length) * 2;
    flags.push(`Very short submission (${words.length} words)`);
  }

  // Check for placeholders
  const placeholderPatterns = [
    /\[your\s+(answer|response|name|company|text)\]/i,
    /\{(name|company|role|position)\}/i,
    /\.\.\.\s*$/,
    /^e\.g\.,?\s/i,
    /lorem ipsum/i,
    /xxx+/i,
    /\[insert\s+/i,
    /\[add\s+/i,
    /<your\s+/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(submission)) {
      signals.hasPlaceholders = true;
      scores.lowEffort = Math.min(100, scores.lowEffort + 30);
      flags.push('Contains unfilled placeholders');
      break;
    }
  }

  // Check for incomplete indicators
  const incompletePatterns = [
    /^(todo|tbd|fix|incomplete|finish)/i,
    /\(to be\s+(completed|filled|added)\)/i,
    /will\s+add\s+later/i,
  ];

  for (const pattern of incompletePatterns) {
    if (pattern.test(submission)) {
      signals.isIncomplete = true;
      scores.lowEffort = Math.min(100, scores.lowEffort + 40);
      flags.push('Submission appears incomplete');
      break;
    }
  }

  // Check for sentence length
  const sentences = submission.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    signals.avgSentenceLength = words.length / sentences.length;
    if (signals.avgSentenceLength < GAMING_CONFIG.lowEffort.minSentenceLength) {
      scores.lowEffort = Math.min(100, scores.lowEffort + 15);
      flags.push('Very short sentences');
    }
  }

  scores.lowEffort = Math.min(100, Math.max(0, scores.lowEffort));
};

/**
 * Detect copy/paste from example
 */
const detectCopyPaste = (
  submission: string,
  exampleSolution: string | undefined,
  signals: GamingSignals,
  flags: string[],
  scores: { copyPaste: number }
): void => {
  if (!exampleSolution) return;

  const normalizedSubmission = submission.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedExample = exampleSolution.toLowerCase().replace(/\s+/g, ' ').trim();

  // Exact match check
  if (normalizedSubmission === normalizedExample) {
    scores.copyPaste = 100;
    signals.exampleSimilarity = 1.0;
    flags.push('Exact copy of example solution');
    return;
  }

  // Calculate similarity using Jaccard index on n-grams
  const submissionNgrams = getNgrams(normalizedSubmission, 3);
  const exampleNgrams = getNgrams(normalizedExample, 3);

  const intersection = new Set([...submissionNgrams].filter(x => exampleNgrams.has(x)));
  const union = new Set([...submissionNgrams, ...exampleNgrams]);

  const similarity = union.size > 0 ? intersection.size / union.size : 0;
  signals.exampleSimilarity = similarity;

  if (similarity >= GAMING_CONFIG.templateMatch.similarityCritical) {
    scores.copyPaste = 90;
    flags.push(`Near-exact copy of example (${(similarity * 100).toFixed(1)}% similar)`);
  } else if (similarity >= GAMING_CONFIG.templateMatch.similarityWarning) {
    scores.copyPaste = 50 + (similarity - GAMING_CONFIG.templateMatch.similarityWarning) * 400;
    flags.push(`High similarity to example solution (${(similarity * 100).toFixed(1)}%)`);
  }

  scores.copyPaste = Math.min(100, Math.max(0, scores.copyPaste));
};

/**
 * Detect template matching from known templates
 */
const detectTemplateMatch = async (
  supabase: SupabaseClient,
  submission: string,
  gameId: string,
  signals: GamingSignals,
  flags: string[],
  scores: { templateMatch: number }
): Promise<void> => {
  try {
    // Get active templates for this game
    const { data: templates } = await supabase
      .from('known_templates')
      .select('*')
      .eq('is_active', true)
      .or(`game_ids.is.null,game_ids.cs.{${gameId}}`);

    if (!templates || templates.length === 0) return;

    let maxSimilarity = 0;
    let matchedType: string | undefined;

    const submissionNgrams = getNgrams(submission.toLowerCase(), 3);

    for (const template of templates) {
      const templateNgrams = getNgrams(template.template_text.toLowerCase(), 3);

      const intersection = new Set([...submissionNgrams].filter(x => templateNgrams.has(x)));
      const union = new Set([...submissionNgrams, ...templateNgrams]);

      const similarity = union.size > 0 ? intersection.size / union.size : 0;

      if (similarity > maxSimilarity && similarity >= template.min_similarity_threshold) {
        maxSimilarity = similarity;
        matchedType = template.template_type;
      }
    }

    if (maxSimilarity >= GAMING_CONFIG.templateMatch.similarityWarning) {
      signals.templateMatchFound = true;
      signals.templateMatchSimilarity = maxSimilarity;
      signals.matchedTemplateType = matchedType;

      if (maxSimilarity >= GAMING_CONFIG.templateMatch.similarityCritical) {
        scores.templateMatch = 90;
        flags.push(`Matches known ${matchedType || 'template'} (${(maxSimilarity * 100).toFixed(1)}%)`);
      } else {
        scores.templateMatch = 50 + (maxSimilarity - GAMING_CONFIG.templateMatch.similarityWarning) * 400;
        flags.push(`Similar to known ${matchedType || 'template'} (${(maxSimilarity * 100).toFixed(1)}%)`);
      }
    }
  } catch (err) {
    console.warn('Template matching failed:', err);
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get n-grams from text
 */
const getNgrams = (text: string, n: number): Set<string> => {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const ngrams = new Set<string>();

  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(' '));
  }

  return ngrams;
};

/**
 * Calculate overall risk score from individual scores
 */
const calculateOverallRiskScore = (scores: {
  keywordStuffing: number;
  templateMatch: number;
  aiGenerated: number;
  copyPaste: number;
  lowEffort: number;
  patternGaming: number;
}): number => {
  // Weighted average with copy/paste and template match having higher weight
  const weights = {
    keywordStuffing: 0.15,
    templateMatch: 0.25,
    aiGenerated: 0.20,
    copyPaste: 0.25,
    lowEffort: 0.10,
    patternGaming: 0.05,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = scores[key as keyof typeof scores];
    if (score > 0) {
      totalScore += score * weight;
      totalWeight += weight;
    }
  }

  // If no issues detected, return 0
  if (totalWeight === 0) return 0;

  // Also factor in the max score (serious issues should raise overall risk)
  const maxScore = Math.max(
    scores.keywordStuffing,
    scores.templateMatch,
    scores.aiGenerated,
    scores.copyPaste,
    scores.lowEffort,
    scores.patternGaming
  );

  // Blend weighted average with max (70/30 split)
  return Math.round((totalScore / totalWeight) * 0.7 + maxScore * 0.3);
};

/**
 * Determine risk level from score
 */
const determineRiskLevel = (riskScore: number): RiskLevel => {
  if (riskScore >= GAMING_CONFIG.riskThresholds.critical) return 'critical';
  if (riskScore >= GAMING_CONFIG.riskThresholds.high) return 'high';
  if (riskScore >= GAMING_CONFIG.riskThresholds.medium) return 'medium';
  if (riskScore >= GAMING_CONFIG.riskThresholds.low) return 'low';
  return 'none';
};

/**
 * Determine action based on risk level
 */
const determineAction = (
  riskLevel: RiskLevel,
  signals: GamingSignals
): { recommendedAction: GamingDetectionResult['recommendedAction']; scorePenalty: number } => {
  // Critical cases (exact copies, known cheats)
  if (riskLevel === 'critical' || signals.exampleSimilarity >= 0.98) {
    return { recommendedAction: 'reject', scorePenalty: GAMING_CONFIG.penalties.critical };
  }

  // High risk
  if (riskLevel === 'high') {
    return { recommendedAction: 'flag_review', scorePenalty: GAMING_CONFIG.penalties.high };
  }

  // Medium risk
  if (riskLevel === 'medium') {
    return { recommendedAction: 'penalize', scorePenalty: GAMING_CONFIG.penalties.medium };
  }

  // Low risk
  if (riskLevel === 'low') {
    return { recommendedAction: 'warn', scorePenalty: GAMING_CONFIG.penalties.low };
  }

  return { recommendedAction: 'allow', scorePenalty: 0 };
};

// ============================================================================
// Logging and Analytics
// ============================================================================

/**
 * Log gaming detection result to database
 */
export const logGamingDetection = async (
  supabase: SupabaseClient,
  attemptId: string,
  playerId: string,
  gameId: string,
  result: GamingDetectionResult,
  originalScore: number,
  adjustedScore: number
): Promise<void> => {
  try {
    await supabase.from('gaming_detection_log').insert({
      attempt_id: attemptId,
      player_id: playerId,
      game_id: gameId,
      overall_risk: result.overallRisk,
      risk_score: result.riskScore,
      keyword_stuffing_score: result.scores.keywordStuffing,
      template_match_score: result.scores.templateMatch,
      ai_generated_score: result.scores.aiGenerated,
      copy_paste_score: result.scores.copyPaste,
      low_effort_score: result.scores.lowEffort,
      pattern_gaming_score: result.scores.patternGaming,
      flags: result.flags,
      signals: result.signals,
      score_penalty_applied: result.scorePenalty,
      was_flagged_for_review: result.recommendedAction === 'flag_review',
      was_auto_rejected: result.recommendedAction === 'reject',
      submission_length: result.signals.wordCount,
      submission_word_count: result.signals.wordCount,
      unique_word_ratio: result.signals.uniqueWordRatio,
      avg_sentence_length: result.signals.avgSentenceLength,
      original_score: originalScore,
      adjusted_score: adjustedScore,
    });

    // Update player's gaming profile
    await supabase.rpc('update_player_gaming_profile', {
      p_player_id: playerId,
      p_risk_score: result.riskScore,
      p_was_flagged: result.recommendedAction === 'flag_review' || result.recommendedAction === 'reject',
      p_detection_type: getDetectionType(result),
    });
  } catch (err) {
    console.warn('Failed to log gaming detection:', err);
  }
};

/**
 * Get primary detection type for logging
 */
const getDetectionType = (result: GamingDetectionResult): string | null => {
  const maxScore = Math.max(
    result.scores.templateMatch,
    result.scores.aiGenerated,
    result.scores.copyPaste
  );

  if (maxScore < 30) return null;

  if (result.scores.templateMatch === maxScore) return 'template';
  if (result.scores.aiGenerated === maxScore) return 'ai';
  if (result.scores.copyPaste === maxScore) return 'copy';

  return null;
};

/**
 * Format gaming detection feedback for display
 */
export const formatGamingFeedback = (result: GamingDetectionResult): string => {
  if (result.overallRisk === 'none' || result.flags.length === 0) {
    return '';
  }

  const riskColors: Record<RiskLevel, string> = {
    none: '#22c55e',
    low: '#eab308',
    medium: '#f97316',
    high: '#ef4444',
    critical: '#dc2626',
  };

  const color = riskColors[result.overallRisk];

  let message = '';
  if (result.overallRisk === 'critical') {
    message = 'This submission appears to be copied or generated. Please provide an original response.';
  } else if (result.overallRisk === 'high') {
    message = 'Some aspects of this submission may need review. Consider revising for originality.';
  } else if (result.overallRisk === 'medium') {
    message = 'A small scoring adjustment was applied. Focus on providing unique, thoughtful responses.';
  } else {
    return ''; // Don't show feedback for low risk
  }

  return `<div style="background:${color}15;border-left:3px solid ${color};padding:10px;margin:10px 0;border-radius:4px;">
    <p style="color:${color};margin:0;font-weight:500;">${message}</p>
  </div>`;
};

/**
 * Add a submission as a known template (for flagged submissions)
 */
export const addKnownTemplate = async (
  supabase: SupabaseClient,
  text: string,
  type: 'example_solution' | 'known_cheat' | 'ai_generated' | 'common_copy' | 'flagged_submission',
  source: string,
  gameIds?: string[]
): Promise<boolean> => {
  try {
    // Create a simple hash of the normalized text
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const hash = normalizedText.slice(0, 100) + '_' + normalizedText.length;

    await supabase.from('known_templates').insert({
      template_hash: hash,
      template_text: normalizedText,
      template_length: normalizedText.length,
      template_type: type,
      source,
      game_ids: gameIds,
    });

    return true;
  } catch (err) {
    console.warn('Failed to add known template:', err);
    return false;
  }
};
