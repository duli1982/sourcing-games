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
  // NEW: Context awareness parameters
  gameContext?: GameWritingContext;
  playerStyleProfile?: PlayerStyleProfile;
}

// ============================================================================
// CONTEXT AWARENESS - Game-specific writing expectations
// ============================================================================

/**
 * Defines expected writing style for different game types
 */
export interface GameWritingContext {
  gameType: GameWritingType;
  expectedFormality: 'casual' | 'professional' | 'formal' | 'technical';
  expectedStructure: 'freeform' | 'structured' | 'template-like' | 'code-like';
  tolerateAiPhrases: boolean;
  tolerateFormalLanguage: boolean;
  expectedMinLength: number;
  expectedMaxLength: number;
  allowedPatterns: string[]; // Regex patterns that are OK for this game type
}

export type GameWritingType =
  | 'boolean_search'      // Technical, code-like queries
  | 'outreach_email'      // Professional, personalized emails
  | 'job_description'     // Formal, structured job postings
  | 'candidate_note'      // Informal notes about candidates
  | 'strategy_document'   // Formal strategy/planning docs
  | 'screening_questions' // Professional, structured questions
  | 'negotiation_script'  // Professional, persuasive language
  | 'diversity_plan'      // Formal, professional DEI content
  | 'sourcing_strategy'   // Professional planning document
  | 'general';            // Default

/**
 * Player's historical writing style profile
 */
export interface PlayerStyleProfile {
  playerId: string;
  sampleCount: number;
  avgWordCount: number;
  avgSentenceLength: number;
  avgFormalityScore: number;
  vocabularyRichness: number; // Unique words / total words
  punctuationStyle: {
    usesExclamations: boolean;
    usesEllipsis: boolean;
    avgCommasPerSentence: number;
  };
  commonPhrases: string[]; // Phrases this player commonly uses
  writingPatterns: {
    startsWithGreeting: boolean;
    endsWithSignoff: boolean;
    usesListFormat: boolean;
    usesBulletPoints: boolean;
  };
  lastUpdated: string;
}

/**
 * Result of comparing submission to player's historical style
 */
export interface StyleComparisonResult {
  isConsistentWithHistory: boolean;
  deviationScore: number; // 0-100, higher = more different from usual style
  deviations: string[];
  confidenceLevel: 'high' | 'medium' | 'low'; // Based on sample count
}

/**
 * Appeal/review queue entry
 */
export interface ReviewQueueEntry {
  id?: string;
  playerId: string;
  gameId: string;
  submissionId?: string;
  submission: string;
  detectionResult: GamingDetectionResult;
  appealReason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_resolved';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  createdAt: string;
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

  // AI detection thresholds - UPDATED: Raised thresholds to reduce false positives
  aiDetection: {
    phrasesForWarning: 4,    // Was 3 - now need more signals
    phrasesForCritical: 8,   // Was 6 - need strong evidence
    minFormalityScore: 0.8,  // Was 0.7 - higher bar for "too formal"
    burstinessThreshold: 0.2, // Was 0.3 - stricter uniformity detection
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
// UPDATED: Reduced severity on formal but legitimate professional phrases
// Only high-weight items are strong AI signals; formal transitions are now low-weight
const AI_PHRASES = [
  // Formal transitions - REDUCED WEIGHT (common in professional writing)
  { phrase: 'in conclusion', weight: 0.1, confidence: 0.3 },
  { phrase: 'furthermore', weight: 0.1, confidence: 0.3 },
  { phrase: 'moreover', weight: 0.1, confidence: 0.3 },
  { phrase: 'additionally', weight: 0.1, confidence: 0.3 },
  { phrase: 'firstly', weight: 0.1, confidence: 0.3 },
  { phrase: 'secondly', weight: 0.1, confidence: 0.3 },
  { phrase: 'thirdly', weight: 0.1, confidence: 0.3 },
  { phrase: 'lastly', weight: 0.1, confidence: 0.3 },

  // Meta-noting phrases - MODERATE (slightly more AI-like)
  { phrase: 'it is worth noting', weight: 0.2, confidence: 0.4 },
  { phrase: 'it is important to note', weight: 0.2, confidence: 0.4 },
  { phrase: 'it should be noted', weight: 0.2, confidence: 0.4 },

  // Hedging language - REDUCED (common in professional communication)
  { phrase: 'may or may not', weight: 0.15, confidence: 0.4 },
  { phrase: 'it could be argued', weight: 0.2, confidence: 0.4 },
  { phrase: 'one might consider', weight: 0.2, confidence: 0.5 },
  { phrase: 'it can be said', weight: 0.2, confidence: 0.4 },

  // Generic acknowledgments - STRONG AI signals (keep high weight)
  { phrase: 'great question', weight: 0.5, confidence: 0.8 },
  { phrase: 'that\'s a great question', weight: 0.6, confidence: 0.85 },
  { phrase: 'thank you for asking', weight: 0.5, confidence: 0.8 },
  { phrase: 'excellent question', weight: 0.5, confidence: 0.8 },

  // AI assistant phrasing - STRONG signals (keep high weight)
  { phrase: 'i\'d be happy to', weight: 0.5, confidence: 0.85 },
  { phrase: 'i hope this helps', weight: 0.6, confidence: 0.9 },
  { phrase: 'feel free to ask', weight: 0.4, confidence: 0.7 },
  { phrase: 'let me explain', weight: 0.2, confidence: 0.4 },
  { phrase: 'here are some', weight: 0.15, confidence: 0.35 },
  { phrase: 'here is a', weight: 0.1, confidence: 0.3 },

  // Overly structured language - REDUCED (common in sourcing strategies)
  { phrase: 'there are several', weight: 0.1, confidence: 0.3 },
  { phrase: 'key points include', weight: 0.15, confidence: 0.4 },
  { phrase: 'important factors', weight: 0.1, confidence: 0.3 },
  { phrase: 'crucial aspects', weight: 0.1, confidence: 0.3 },

  // Meta-commentary - REDUCED (common in professional writing)
  { phrase: 'as mentioned earlier', weight: 0.1, confidence: 0.3 },
  { phrase: 'as stated above', weight: 0.1, confidence: 0.3 },
  { phrase: 'to summarize', weight: 0.15, confidence: 0.4 },
  { phrase: 'in summary', weight: 0.15, confidence: 0.4 },

  // NEW: Very strong AI signals (chatbot-like responses)
  { phrase: 'certainly!', weight: 0.6, confidence: 0.85 },
  { phrase: 'absolutely!', weight: 0.4, confidence: 0.6 },
  { phrase: 'i understand your', weight: 0.5, confidence: 0.8 },
  { phrase: 'as an ai', weight: 0.9, confidence: 0.99 },
  { phrase: 'as a language model', weight: 0.9, confidence: 0.99 },
  { phrase: 'i cannot provide', weight: 0.7, confidence: 0.9 },
  { phrase: 'i\'m not able to', weight: 0.5, confidence: 0.75 },
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
// GAME WRITING CONTEXT PROFILES
// Defines expected writing styles for different game types
// ============================================================================

const GAME_WRITING_CONTEXTS: Record<SkillCategory | string, GameWritingContext> = {
  // Boolean/X-Ray games - technical, code-like queries
  boolean: {
    gameType: 'boolean_search',
    expectedFormality: 'technical',
    expectedStructure: 'code-like',
    tolerateAiPhrases: false, // AI phrases don't belong in boolean queries
    tolerateFormalLanguage: false,
    expectedMinLength: 10,
    expectedMaxLength: 500,
    allowedPatterns: [
      'AND|OR|NOT', // Boolean operators
      'site:|inurl:|filetype:|intitle:', // X-ray operators
    ],
  },
  xray: {
    gameType: 'boolean_search',
    expectedFormality: 'technical',
    expectedStructure: 'code-like',
    tolerateAiPhrases: false,
    tolerateFormalLanguage: false,
    expectedMinLength: 15,
    expectedMaxLength: 800,
    allowedPatterns: [
      'site:|inurl:|filetype:|intitle:',
      '\\(.*\\)', // Parentheses grouping
    ],
  },

  // Outreach games - professional, personalized emails
  outreach: {
    gameType: 'outreach_email',
    expectedFormality: 'professional',
    expectedStructure: 'structured',
    tolerateAiPhrases: true, // Professional emails can sound formal
    tolerateFormalLanguage: true,
    expectedMinLength: 50,
    expectedMaxLength: 1500,
    allowedPatterns: [
      '^(hi|hello|dear|good morning|good afternoon)',
      '(best regards|sincerely|thanks|thank you|looking forward)',
    ],
  },

  // Job description games - formal, structured
  'job-description': {
    gameType: 'job_description',
    expectedFormality: 'formal',
    expectedStructure: 'template-like',
    tolerateAiPhrases: true, // JDs often sound formal
    tolerateFormalLanguage: true,
    expectedMinLength: 100,
    expectedMaxLength: 3000,
    allowedPatterns: [
      '(requirements|qualifications|responsibilities|about the role)',
      '(we are looking for|you will|ideal candidate)',
    ],
  },

  // Screening/interview games - professional questions
  screening: {
    gameType: 'screening_questions',
    expectedFormality: 'professional',
    expectedStructure: 'structured',
    tolerateAiPhrases: true,
    tolerateFormalLanguage: true,
    expectedMinLength: 30,
    expectedMaxLength: 1000,
    allowedPatterns: [
      '\\?$', // Questions end with ?
      '(tell me about|describe|explain|what|how|why)',
    ],
  },

  // Negotiation games - professional, persuasive
  negotiation: {
    gameType: 'negotiation_script',
    expectedFormality: 'professional',
    expectedStructure: 'freeform',
    tolerateAiPhrases: true,
    tolerateFormalLanguage: true,
    expectedMinLength: 50,
    expectedMaxLength: 2000,
    allowedPatterns: [
      '(offer|compensation|salary|benefits|value)',
      '(i understand|let me|consider|propose)',
    ],
  },

  // Diversity/DEI games - formal, professional
  diversity: {
    gameType: 'diversity_plan',
    expectedFormality: 'formal',
    expectedStructure: 'structured',
    tolerateAiPhrases: true,
    tolerateFormalLanguage: true,
    expectedMinLength: 75,
    expectedMaxLength: 2500,
    allowedPatterns: [
      '(diversity|inclusion|equity|belonging|representation)',
      '(underrepresented|bias|inclusive|equitable)',
    ],
  },

  // Persona/candidate profile games - semi-formal notes
  persona: {
    gameType: 'candidate_note',
    expectedFormality: 'professional',
    expectedStructure: 'freeform',
    tolerateAiPhrases: false, // Notes should be more natural
    tolerateFormalLanguage: false,
    expectedMinLength: 30,
    expectedMaxLength: 1500,
    allowedPatterns: [],
  },

  // ATS games - technical/professional
  ats: {
    gameType: 'strategy_document',
    expectedFormality: 'professional',
    expectedStructure: 'structured',
    tolerateAiPhrases: true,
    tolerateFormalLanguage: true,
    expectedMinLength: 50,
    expectedMaxLength: 2000,
    allowedPatterns: [],
  },

  // LinkedIn games - professional networking
  linkedin: {
    gameType: 'outreach_email',
    expectedFormality: 'professional',
    expectedStructure: 'structured',
    tolerateAiPhrases: true,
    tolerateFormalLanguage: true,
    expectedMinLength: 30,
    expectedMaxLength: 1000,
    allowedPatterns: [
      '(connection|network|linkedin|inmail|profile)',
    ],
  },

  // Talent intelligence - formal analysis
  'talent-intelligence': {
    gameType: 'strategy_document',
    expectedFormality: 'formal',
    expectedStructure: 'structured',
    tolerateAiPhrases: true,
    tolerateFormalLanguage: true,
    expectedMinLength: 100,
    expectedMaxLength: 3000,
    allowedPatterns: [],
  },

  // AI prompting games - technical prompts
  'ai-prompting': {
    gameType: 'general',
    expectedFormality: 'technical',
    expectedStructure: 'freeform',
    tolerateAiPhrases: true, // Prompts might include AI-like language
    tolerateFormalLanguage: true,
    expectedMinLength: 20,
    expectedMaxLength: 2000,
    allowedPatterns: [],
  },

  // Multi-platform games
  multiplatform: {
    gameType: 'sourcing_strategy',
    expectedFormality: 'professional',
    expectedStructure: 'structured',
    tolerateAiPhrases: true,
    tolerateFormalLanguage: true,
    expectedMinLength: 50,
    expectedMaxLength: 2500,
    allowedPatterns: [],
  },

  // Default/general
  general: {
    gameType: 'general',
    expectedFormality: 'professional',
    expectedStructure: 'freeform',
    tolerateAiPhrases: false,
    tolerateFormalLanguage: false,
    expectedMinLength: 20,
    expectedMaxLength: 2000,
    allowedPatterns: [],
  },
};

/**
 * Get game writing context for a skill category
 */
export const getGameWritingContext = (skillCategory: SkillCategory | string): GameWritingContext => {
  return GAME_WRITING_CONTEXTS[skillCategory] || GAME_WRITING_CONTEXTS.general;
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

// ============================================================================
// PLAYER STYLE PROFILING - Build and compare against historical writing style
// ============================================================================

/**
 * Build a style profile from a player's historical submissions
 */
export const buildPlayerStyleProfile = async (
  supabase: SupabaseClient,
  playerId: string,
  minSamples: number = 5
): Promise<PlayerStyleProfile | null> => {
  try {
    // Fetch recent submissions for this player
    const { data: player } = await supabase
      .from('players')
      .select('progress')
      .eq('id', playerId)
      .single();

    if (!player?.progress?.attempts) return null;

    const attempts = player.progress.attempts as Array<{
      submission: string;
      score: number;
      timestamp: string;
    }>;

    // Filter to non-empty submissions
    const validSubmissions = attempts
      .filter(a => a.submission && a.submission.length > 20)
      .slice(-50); // Use last 50 submissions max

    if (validSubmissions.length < minSamples) {
      return null; // Not enough data to build profile
    }

    // Analyze each submission
    const analyses = validSubmissions.map(a => analyzeSubmissionStyle(a.submission));

    // Aggregate stats
    const avgWordCount = analyses.reduce((s, a) => s + a.wordCount, 0) / analyses.length;
    const avgSentenceLength = analyses.reduce((s, a) => s + a.avgSentenceLength, 0) / analyses.length;
    const avgFormalityScore = analyses.reduce((s, a) => s + a.formalityScore, 0) / analyses.length;
    const avgVocabRichness = analyses.reduce((s, a) => s + a.vocabularyRichness, 0) / analyses.length;

    // Find common phrases (appearing in 30%+ of submissions)
    const phraseCounts: Record<string, number> = {};
    for (const a of analyses) {
      for (const phrase of a.commonPhrases) {
        phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
      }
    }
    const threshold = analyses.length * 0.3;
    const commonPhrases = Object.entries(phraseCounts)
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);

    // Aggregate punctuation style
    const usesExclamations = analyses.filter(a => a.punctuation.usesExclamations).length > analyses.length * 0.3;
    const usesEllipsis = analyses.filter(a => a.punctuation.usesEllipsis).length > analyses.length * 0.3;
    const avgCommas = analyses.reduce((s, a) => s + a.punctuation.avgCommasPerSentence, 0) / analyses.length;

    // Aggregate writing patterns
    const startsWithGreeting = analyses.filter(a => a.patterns.startsWithGreeting).length > analyses.length * 0.3;
    const endsWithSignoff = analyses.filter(a => a.patterns.endsWithSignoff).length > analyses.length * 0.3;
    const usesListFormat = analyses.filter(a => a.patterns.usesListFormat).length > analyses.length * 0.3;
    const usesBulletPoints = analyses.filter(a => a.patterns.usesBulletPoints).length > analyses.length * 0.3;

    return {
      playerId,
      sampleCount: analyses.length,
      avgWordCount,
      avgSentenceLength,
      avgFormalityScore,
      vocabularyRichness: avgVocabRichness,
      punctuationStyle: {
        usesExclamations,
        usesEllipsis,
        avgCommasPerSentence: avgCommas,
      },
      commonPhrases,
      writingPatterns: {
        startsWithGreeting,
        endsWithSignoff,
        usesListFormat,
        usesBulletPoints,
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Failed to build player style profile:', err);
    return null;
  }
};

/**
 * Analyze writing style of a single submission
 */
const FORMALITY_INDICATORS = [
  /\b(therefore|thus|hence|consequently|accordingly)\b/gi,
  /\b(shall|ought|must|hereby)\b/gi,
  /\b(aforementioned|hereunder|therein|whereby)\b/gi,
];

const calculateFormalityScore = (text: string): number => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  let formalityCount = 0;
  for (const pattern of FORMALITY_INDICATORS) {
    const matches = text.match(pattern);
    formalityCount += matches ? matches.length : 0;
  }

  return Math.min(1, formalityCount / (words.length / 50));
};

const analyzeSubmissionStyle = (submission: string): {
  wordCount: number;
  avgSentenceLength: number;
  formalityScore: number;
  vocabularyRichness: number;
  commonPhrases: string[];
  punctuation: {
    usesExclamations: boolean;
    usesEllipsis: boolean;
    avgCommasPerSentence: number;
  };
  patterns: {
    startsWithGreeting: boolean;
    endsWithSignoff: boolean;
    usesListFormat: boolean;
    usesBulletPoints: boolean;
  };
} => {
  const normalized = submission.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const sentences = submission.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Word count and sentence length
  const wordCount = words.length;
  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;

  // Vocabulary richness (unique words / total words)
  const uniqueWords = new Set(words.map(w => w.replace(/[^\w]/g, '')));
  const vocabularyRichness = wordCount > 0 ? uniqueWords.size / wordCount : 0;

  // Calculate formality score
  const formalityScore = calculateFormalityScore(normalized);

  // Extract common 2-3 word phrases
  const commonPhrases = extractCommonPhrases(normalized);

  // Punctuation analysis
  const usesExclamations = /!/.test(submission);
  const usesEllipsis = /\.{3}|…/.test(submission);
  const commaCount = (submission.match(/,/g) || []).length;
  const avgCommasPerSentence = sentences.length > 0 ? commaCount / sentences.length : 0;

  // Pattern analysis
  const startsWithGreeting = /^(hi|hello|dear|good\s+(morning|afternoon|evening)|hey|greetings)/i.test(submission.trim());
  const endsWithSignoff = /(best|regards|sincerely|thanks|thank you|cheers|warmly)\s*[,.!]?\s*$/i.test(submission.trim());
  const usesListFormat = /^\s*[-•*]\s+/m.test(submission) || /^\s*\d+\.\s+/m.test(submission);
  const usesBulletPoints = /[-•*]\s+/.test(submission);

  return {
    wordCount,
    avgSentenceLength,
    formalityScore,
    vocabularyRichness,
    commonPhrases,
    punctuation: {
      usesExclamations,
      usesEllipsis,
      avgCommasPerSentence,
    },
    patterns: {
      startsWithGreeting,
      endsWithSignoff,
      usesListFormat,
      usesBulletPoints,
    },
  };
};

/**
 * Extract common 2-3 word phrases from text
 */
const extractCommonPhrases = (text: string): string[] => {
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const phrases: string[] = [];

  // 2-grams
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  // 3-grams
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return phrases.slice(0, 20);
};

/**
 * Compare a submission against player's historical style
 */
export const compareToPlayerStyle = (
  submission: string,
  profile: PlayerStyleProfile
): StyleComparisonResult => {
  const current = analyzeSubmissionStyle(submission);
  const deviations: string[] = [];
  let deviationScore = 0;

  // Word count deviation
  const wordCountRatio = current.wordCount / Math.max(profile.avgWordCount, 1);
  if (wordCountRatio < 0.3 || wordCountRatio > 3) {
    deviations.push(`Unusual length (${current.wordCount} words vs typical ${Math.round(profile.avgWordCount)})`);
    deviationScore += 20;
  } else if (wordCountRatio < 0.5 || wordCountRatio > 2) {
    deviationScore += 10;
  }

  // Sentence length deviation
  const sentenceLengthRatio = current.avgSentenceLength / Math.max(profile.avgSentenceLength, 1);
  if (sentenceLengthRatio < 0.4 || sentenceLengthRatio > 2.5) {
    deviations.push(`Unusual sentence structure`);
    deviationScore += 15;
  }

  // Formality deviation
  const formalityDiff = Math.abs(current.formalityScore - profile.avgFormalityScore);
  if (formalityDiff > 0.4) {
    deviations.push(`Significantly different formality level`);
    deviationScore += 25;
  } else if (formalityDiff > 0.25) {
    deviationScore += 10;
  }

  // Vocabulary richness deviation
  const vocabDiff = Math.abs(current.vocabularyRichness - profile.vocabularyRichness);
  if (vocabDiff > 0.2) {
    deviations.push(`Unusual vocabulary variety`);
    deviationScore += 15;
  }

  // Punctuation style deviation
  if (current.punctuation.usesExclamations !== profile.punctuationStyle.usesExclamations) {
    deviationScore += 5;
  }
  if (current.punctuation.usesEllipsis !== profile.punctuationStyle.usesEllipsis) {
    deviationScore += 5;
  }

  // Writing pattern deviation
  if (current.patterns.startsWithGreeting !== profile.writingPatterns.startsWithGreeting) {
    deviationScore += 5;
  }
  if (current.patterns.endsWithSignoff !== profile.writingPatterns.endsWithSignoff) {
    deviationScore += 5;
  }

  // Determine confidence based on sample count
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
  if (profile.sampleCount >= 20) {
    confidenceLevel = 'high';
  } else if (profile.sampleCount >= 10) {
    confidenceLevel = 'medium';
  }

  // Cap deviation score
  deviationScore = Math.min(100, deviationScore);

  return {
    isConsistentWithHistory: deviationScore < 40,
    deviationScore,
    deviations,
    confidenceLevel,
  };
};

// ============================================================================
// APPEAL/REVIEW QUEUE - Allow flagged submissions to be reviewed
// ============================================================================

/**
 * Add a submission to the review queue
 */
export const addToReviewQueue = async (
  supabase: SupabaseClient,
  playerId: string,
  gameId: string,
  submission: string,
  detectionResult: GamingDetectionResult,
  attemptId?: string
): Promise<{ success: boolean; entryId?: string }> => {
  try {
    const { data, error } = await supabase
      .from('submission_review_queue')
      .insert({
        player_id: playerId,
        game_id: gameId,
        attempt_id: attemptId,
        submission_text: submission,
        detection_result: detectionResult,
        overall_risk: detectionResult.overallRisk,
        risk_score: detectionResult.riskScore,
        flags: detectionResult.flags,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to add to review queue:', error);
      return { success: false };
    }

    return { success: true, entryId: data?.id };
  } catch (err) {
    console.error('Error adding to review queue:', err);
    return { success: false };
  }
};

/**
 * Submit an appeal for a flagged submission
 */
export const submitAppeal = async (
  supabase: SupabaseClient,
  playerId: string,
  gameId: string,
  attemptId: string,
  appealReason: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if there's an existing queue entry
    const { data: existing } = await supabase
      .from('submission_review_queue')
      .select('id, status')
      .eq('player_id', playerId)
      .eq('attempt_id', attemptId)
      .single();

    if (existing && existing.status !== 'pending') {
      return { success: false, error: 'This submission has already been reviewed' };
    }

    if (existing) {
      // Update existing entry with appeal reason
      await supabase
        .from('submission_review_queue')
        .update({
          appeal_reason: appealReason,
          appeal_submitted_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new appeal entry
      await supabase
        .from('submission_review_queue')
        .insert({
          player_id: playerId,
          game_id: gameId,
          attempt_id: attemptId,
          appeal_reason: appealReason,
          status: 'pending',
          created_at: new Date().toISOString(),
          appeal_submitted_at: new Date().toISOString(),
        });
    }

    return { success: true };
  } catch (err) {
    console.error('Error submitting appeal:', err);
    return { success: false, error: 'Failed to submit appeal' };
  }
};

/**
 * Get pending review queue entries
 */
export const getPendingReviews = async (
  supabase: SupabaseClient,
  limit: number = 50
): Promise<ReviewQueueEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('submission_review_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Failed to get pending reviews:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      playerId: row.player_id,
      gameId: row.game_id,
      submissionId: row.attempt_id,
      submission: row.submission_text,
      detectionResult: row.detection_result,
      appealReason: row.appeal_reason,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Error getting pending reviews:', err);
    return [];
  }
};

/**
 * Resolve a review queue entry
 */
export const resolveReview = async (
  supabase: SupabaseClient,
  entryId: string,
  decision: 'approved' | 'rejected',
  reviewerId: string,
  resolution?: string,
  restoreScore?: boolean
): Promise<boolean> => {
  try {
    const { data: entry, error: fetchError } = await supabase
      .from('submission_review_queue')
      .select('*')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      console.error('Review entry not found:', entryId);
      return false;
    }

    // Update review status
    await supabase
      .from('submission_review_queue')
      .update({
        status: decision,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        resolution: resolution,
      })
      .eq('id', entryId);

    // If approved and score restoration requested, restore the original score
    if (decision === 'approved' && restoreScore && entry.attempt_id) {
      // This would need to update the player's progress - implementation depends on data structure
      console.log(`Score restoration requested for attempt ${entry.attempt_id}`);
    }

    return true;
  } catch (err) {
    console.error('Error resolving review:', err);
    return false;
  }
};

/**
 * Auto-resolve reviews based on additional context
 * Called when new data suggests a flagged submission was legitimate
 */
export const autoResolveReviews = async (
  supabase: SupabaseClient,
  criteria: {
    maxRiskScore?: number;
    playerMinSubmissions?: number;
    maxAgeHours?: number;
  }
): Promise<number> => {
  try {
    const {
      maxRiskScore = 45,
      playerMinSubmissions = 10,
      maxAgeHours = 72,
    } = criteria;

    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

    // Get pending reviews that meet auto-resolve criteria
    const { data: reviews } = await supabase
      .from('submission_review_queue')
      .select('id, player_id, risk_score')
      .eq('status', 'pending')
      .lte('risk_score', maxRiskScore)
      .gte('created_at', cutoffTime);

    if (!reviews || reviews.length === 0) return 0;

    let resolved = 0;

    for (const review of reviews) {
      // Check player history
      const { data: player } = await supabase
        .from('players')
        .select('progress')
        .eq('id', review.player_id)
        .single();

      const attempts = player?.progress?.attempts || [];
      if (attempts.length >= playerMinSubmissions) {
        // Auto-approve
        await supabase
          .from('submission_review_queue')
          .update({
            status: 'auto_resolved',
            resolution: 'Auto-resolved: Player has good history and risk score was low',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', review.id);
        resolved++;
      }
    }

    return resolved;
  } catch (err) {
    console.error('Error auto-resolving reviews:', err);
    return 0;
  }
};

// ============================================================================
// CONTEXT-AWARE DETECTION - Apply game context to adjust detection
// ============================================================================

/**
 * Apply context-aware adjustments to gaming detection scores
 */
export const applyContextAwareAdjustments = (
  scores: GamingDetectionResult['scores'],
  signals: GamingSignals,
  flags: string[],
  gameContext: GameWritingContext,
  playerStyle?: StyleComparisonResult
): {
  adjustedScores: GamingDetectionResult['scores'];
  adjustedFlags: string[];
  contextAdjustments: string[];
} => {
  const adjustedScores = { ...scores };
  const adjustedFlags = [...flags];
  const contextAdjustments: string[] = [];

  // 1. Adjust AI detection based on expected formality
  if (gameContext.tolerateAiPhrases || gameContext.tolerateFormalLanguage) {
    // Reduce AI detection score for games that expect formal writing
    if (adjustedScores.aiGenerated > 0) {
      const reduction = gameContext.tolerateAiPhrases ? 0.5 : 0.3;
      const originalScore = adjustedScores.aiGenerated;
      adjustedScores.aiGenerated = Math.max(0, adjustedScores.aiGenerated * (1 - reduction));

      if (originalScore !== adjustedScores.aiGenerated) {
        contextAdjustments.push(`AI score reduced (formal writing expected for ${gameContext.gameType})`);

        // Remove or soften AI-related flags
        const aiFlags = adjustedFlags.filter(f => f.toLowerCase().includes('ai') || f.toLowerCase().includes('formal'));
        if (aiFlags.length > 0 && adjustedScores.aiGenerated < 30) {
          // Remove AI flags if score is now low
          for (const flag of aiFlags) {
            const idx = adjustedFlags.indexOf(flag);
            if (idx >= 0) adjustedFlags.splice(idx, 1);
          }
        }
      }
    }
  }

  // 2. Adjust based on expected structure
  if (gameContext.expectedStructure === 'template-like' || gameContext.expectedStructure === 'structured') {
    // Reduce template match score for games that expect template-like content
    if (adjustedScores.templateMatch > 0 && adjustedScores.templateMatch < 70) {
      adjustedScores.templateMatch = Math.max(0, adjustedScores.templateMatch * 0.6);
      contextAdjustments.push(`Template score reduced (structured format expected)`);
    }
  }

  // 3. Adjust based on player's historical style
  if (playerStyle && playerStyle.confidenceLevel !== 'low') {
    if (playerStyle.isConsistentWithHistory) {
      // Player is writing in their usual style - reduce suspicion
      const styleBonus = playerStyle.confidenceLevel === 'high' ? 0.3 : 0.2;
      adjustedScores.aiGenerated = Math.max(0, adjustedScores.aiGenerated * (1 - styleBonus));
      contextAdjustments.push(`Style consistent with player history (confidence: ${playerStyle.confidenceLevel})`);
    } else if (playerStyle.deviationScore > 60) {
      // Significant deviation from usual style - add suspicion
      const penalty = Math.min(20, playerStyle.deviationScore * 0.3);
      adjustedScores.aiGenerated = Math.min(100, adjustedScores.aiGenerated + penalty);
      contextAdjustments.push(`Style deviates from player history: ${playerStyle.deviations.join(', ')}`);
      adjustedFlags.push(`Writing style significantly different from usual`);
    }
  }

  // 4. Check allowed patterns
  if (gameContext.allowedPatterns.length > 0) {
    for (const patternStr of gameContext.allowedPatterns) {
      try {
        const pattern = new RegExp(patternStr, 'i');
        // If submission matches expected patterns, reduce suspicion
        // (This would need the actual submission text to check)
      } catch {
        // Invalid regex, skip
      }
    }
  }

  return {
    adjustedScores,
    adjustedFlags,
    contextAdjustments,
  };
};

/**
 * Enhanced detection with context awareness
 */
export const detectGamingWithContext = async (
  submission: string,
  context: DetectionContext,
  supabase?: SupabaseClient
): Promise<GamingDetectionResult & { contextAdjustments: string[] }> => {
  // Run base detection
  const baseResult = await detectGaming(submission, context, supabase);

  // Get game context
  const gameContext = context.gameContext || getGameWritingContext(context.skillCategory);

  // Build player style profile if not provided and we have supabase
  let playerStyle: StyleComparisonResult | undefined;
  if (supabase && !context.playerStyleProfile) {
    const profile = await buildPlayerStyleProfile(supabase, context.playerId);
    if (profile) {
      playerStyle = compareToPlayerStyle(submission, profile);
    }
  } else if (context.playerStyleProfile) {
    playerStyle = compareToPlayerStyle(submission, context.playerStyleProfile);
  }

  // Apply context-aware adjustments
  const { adjustedScores, adjustedFlags, contextAdjustments } = applyContextAwareAdjustments(
    baseResult.scores,
    baseResult.signals,
    baseResult.flags,
    gameContext,
    playerStyle
  );

  // Recalculate overall risk with adjusted scores
  const adjustedRiskScore = calculateOverallRiskScore(adjustedScores);
  const adjustedRiskLevel = determineRiskLevel(adjustedRiskScore);
  const { recommendedAction, scorePenalty } = determineAction(adjustedRiskLevel, baseResult.signals);

  // If flagged for review, add to queue
  if (supabase && recommendedAction === 'flag_review') {
    await addToReviewQueue(supabase, context.playerId, context.gameId, submission, {
      ...baseResult,
      scores: adjustedScores,
      flags: adjustedFlags,
      overallRisk: adjustedRiskLevel,
      riskScore: adjustedRiskScore,
      recommendedAction,
      scorePenalty,
    });
  }

  return {
    ...baseResult,
    scores: adjustedScores,
    flags: adjustedFlags,
    overallRisk: adjustedRiskLevel,
    riskScore: adjustedRiskScore,
    recommendedAction,
    scorePenalty,
    contextAdjustments,
  };
};

/**
 * Format context adjustment feedback for display
 */
export const formatContextAdjustmentFeedback = (
  contextAdjustments: string[]
): string => {
  if (contextAdjustments.length === 0) return '';

  return `
<details style="margin-top:8px;font-size:0.85em;color:#94a3b8;">
  <summary style="cursor:pointer;">Scoring context adjustments applied</summary>
  <ul style="margin-top:4px;padding-left:20px;">
    ${contextAdjustments.map(a => `<li>${a}</li>`).join('')}
  </ul>
</details>`;
};
