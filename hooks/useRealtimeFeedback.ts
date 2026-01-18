/**
 * Real-Time Feedback Preview Hook
 *
 * Provides instant validation feedback as players type their submissions.
 * Includes word count, keyword detection, boolean operator checks,
 * estimated score range, and contextual tips.
 *
 * @version 1.0.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Game } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface RealtimeValidationResult {
  // Basic stats
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  paragraphCount: number;

  // Quality indicators
  estimatedScoreRange: [number, number];
  confidenceLevel: 'low' | 'medium' | 'high';
  overallQuality: 'poor' | 'needs_work' | 'good' | 'excellent';

  // Detailed checks
  checks: RealtimeCheck[];

  // Contextual tips
  tips: ContextualTip[];

  // Keyword analysis
  keywordsFound: string[];
  keywordsMissing: string[];

  // Boolean-specific (for boolean/xray games)
  booleanAnalysis?: BooleanAnalysis;

  // Outreach-specific (for outreach games)
  outreachAnalysis?: OutreachAnalysis;

  // General quality signals
  qualitySignals: QualitySignal[];
}

export interface RealtimeCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface ContextualTip {
  id: string;
  message: string;
  type: 'hint' | 'suggestion' | 'warning' | 'encouragement';
  priority: number; // Lower = higher priority
  triggerCondition: string;
}

export interface BooleanAnalysis {
  hasAndOperator: boolean;
  hasOrOperator: boolean;
  hasNotOperator: boolean;
  hasParentheses: boolean;
  hasQuotes: boolean;
  hasSiteOperator: boolean;
  hasFiletypeOperator: boolean;
  operatorCount: number;
  isBalanced: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface OutreachAnalysis {
  hasPersonalization: boolean;
  hasCallToAction: boolean;
  hasValueProposition: boolean;
  tone: 'formal' | 'casual' | 'professional';
  wordCountStatus: 'too_short' | 'optimal' | 'too_long';
  hasGreeting: boolean;
  hasSignOff: boolean;
  questionCount: number;
}

export interface QualitySignal {
  id: string;
  label: string;
  status: 'good' | 'warning' | 'error';
  value: string | number;
}

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_MS = 300; // Debounce typing for performance

// Word count thresholds by skill category
const WORD_COUNT_THRESHOLDS: Record<string, { min: number; optimal: number; max: number }> = {
  boolean: { min: 10, optimal: 30, max: 100 },
  xray: { min: 10, optimal: 40, max: 120 },
  outreach: { min: 50, optimal: 150, max: 300 },
  diversity: { min: 100, optimal: 250, max: 500 },
  ats: { min: 80, optimal: 200, max: 400 },
  persona: { min: 100, optimal: 300, max: 600 },
  default: { min: 50, optimal: 150, max: 400 },
};

// Common boolean keywords to detect
const BOOLEAN_KEYWORDS = [
  'AND', 'OR', 'NOT', 'site:', 'filetype:', 'inurl:', 'intitle:',
  '"', '(', ')', '-', '*', '~'
];

// Common outreach keywords to detect
const OUTREACH_POSITIVE_SIGNALS = [
  'noticed', 'impressed', 'interested', 'opportunity', 'role', 'team',
  'company', 'position', 'skills', 'experience', 'background',
  'chat', 'call', 'discuss', 'connect', 'learn more'
];

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRealtimeFeedback(
  submission: string,
  game: Game
): RealtimeValidationResult {
  const [debouncedSubmission, setDebouncedSubmission] = useState(submission);

  // Debounce the submission text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSubmission(submission);
    }, DEBOUNCE_MS);

    return () => clearTimeout(handler);
  }, [submission]);

  // Memoize the analysis result
  const result = useMemo(() => {
    return analyzeSubmission(debouncedSubmission, game);
  }, [debouncedSubmission, game]);

  return result;
}

// ============================================================================
// Analysis Functions
// ============================================================================

function analyzeSubmission(submission: string, game: Game): RealtimeValidationResult {
  const trimmed = submission.trim();

  // Basic stats
  const wordCount = countWords(trimmed);
  const charCount = trimmed.length;
  const sentenceCount = countSentences(trimmed);
  const paragraphCount = countParagraphs(trimmed);

  // Get thresholds for this game type
  const thresholds = WORD_COUNT_THRESHOLDS[game.skillCategory] || WORD_COUNT_THRESHOLDS.default;

  // Analyze based on game type
  let booleanAnalysis: BooleanAnalysis | undefined;
  let outreachAnalysis: OutreachAnalysis | undefined;

  if (game.skillCategory === 'boolean' || game.skillCategory === 'xray') {
    booleanAnalysis = analyzeBooleanSearch(trimmed);
  }

  if (game.skillCategory === 'outreach') {
    outreachAnalysis = analyzeOutreachMessage(trimmed, thresholds);
  }

  // Keyword analysis
  const validationConfig = game.validation as any;
  const expectedKeywords = validationConfig?.keywords || validationConfig?.mustMention || [];
  const { found: keywordsFound, missing: keywordsMissing } = analyzeKeywords(trimmed, expectedKeywords);

  // Generate checks
  const checks = generateChecks(trimmed, game, booleanAnalysis, outreachAnalysis, wordCount, thresholds);

  // Generate tips
  const tips = generateTips(trimmed, game, booleanAnalysis, outreachAnalysis, wordCount, thresholds, checks);

  // Calculate estimated score range
  const { range: estimatedScoreRange, confidence: confidenceLevel } = estimateScoreRange(
    checks,
    wordCount,
    thresholds,
    booleanAnalysis,
    outreachAnalysis
  );

  // Determine overall quality
  const overallQuality = determineOverallQuality(estimatedScoreRange);

  // Generate quality signals
  const qualitySignals = generateQualitySignals(
    wordCount,
    thresholds,
    booleanAnalysis,
    outreachAnalysis,
    checks
  );

  return {
    wordCount,
    charCount,
    sentenceCount,
    paragraphCount,
    estimatedScoreRange,
    confidenceLevel,
    overallQuality,
    checks,
    tips,
    keywordsFound,
    keywordsMissing,
    booleanAnalysis,
    outreachAnalysis,
    qualitySignals,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) || []).length || (text.length > 0 ? 1 : 0);
}

function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || (text.length > 0 ? 1 : 0);
}

function analyzeBooleanSearch(text: string): BooleanAnalysis {
  const upperText = text.toUpperCase();

  const hasAndOperator = /\bAND\b/.test(upperText) || /\s+\+/.test(text);
  const hasOrOperator = /\bOR\b/.test(upperText) || /\s+\|/.test(text);
  const hasNotOperator = /\bNOT\b/.test(upperText) || /\s+-[a-zA-Z]/.test(text);
  const hasParentheses = /\([^)]+\)/.test(text);
  const hasQuotes = /"[^"]+"|'[^']+'/.test(text);
  const hasSiteOperator = /site:/i.test(text);
  const hasFiletypeOperator = /filetype:/i.test(text) || /inurl:/i.test(text) || /intitle:/i.test(text);

  // Count operators
  const andCount = (upperText.match(/\bAND\b/g) || []).length;
  const orCount = (upperText.match(/\bOR\b/g) || []).length;
  const notCount = (upperText.match(/\bNOT\b/g) || []).length;
  const operatorCount = andCount + orCount + notCount;

  // Check parentheses balance
  const openCount = (text.match(/\(/g) || []).length;
  const closeCount = (text.match(/\)/g) || []).length;
  const isBalanced = openCount === closeCount;

  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (operatorCount >= 4 || (hasParentheses && operatorCount >= 2)) {
    complexity = 'complex';
  } else if (operatorCount >= 2 || hasParentheses || hasSiteOperator) {
    complexity = 'moderate';
  }

  return {
    hasAndOperator,
    hasOrOperator,
    hasNotOperator,
    hasParentheses,
    hasQuotes,
    hasSiteOperator,
    hasFiletypeOperator,
    operatorCount,
    isBalanced,
    complexity,
  };
}

function analyzeOutreachMessage(
  text: string,
  thresholds: { min: number; optimal: number; max: number }
): OutreachAnalysis {
  const lowerText = text.toLowerCase();
  const wordCount = countWords(text);

  // Check for personalization indicators
  const hasPersonalization = /\b(noticed|saw|impressed|your|you['']?ve|background|experience|work at|at \w+)\b/i.test(text);

  // Check for call to action
  const hasCallToAction = /\b(let me know|would you be|are you open|can we|could we|schedule|call|chat|discuss|reply|interested)\b/i.test(text);

  // Check for value proposition
  const hasValueProposition = /\b(opportunity|role|position|team|company|offer|benefit|growth|impact|mission)\b/i.test(text);

  // Detect tone
  let tone: 'formal' | 'casual' | 'professional' = 'professional';
  if (/\b(hey|hi there|hiya|sup)\b/i.test(text)) {
    tone = 'casual';
  } else if (/\b(dear|respected|esteemed|hereby)\b/i.test(text)) {
    tone = 'formal';
  }

  // Word count status
  let wordCountStatus: 'too_short' | 'optimal' | 'too_long' = 'optimal';
  if (wordCount < thresholds.min) {
    wordCountStatus = 'too_short';
  } else if (wordCount > thresholds.max) {
    wordCountStatus = 'too_long';
  }

  // Check for greeting
  const hasGreeting = /^(hi|hello|hey|dear|good (morning|afternoon|evening))/i.test(text.trim());

  // Check for sign-off
  const hasSignOff = /\b(best|regards|thanks|thank you|cheers|sincerely|looking forward)\b/i.test(lowerText);

  // Count questions
  const questionCount = (text.match(/\?/g) || []).length;

  return {
    hasPersonalization,
    hasCallToAction,
    hasValueProposition,
    tone,
    wordCountStatus,
    hasGreeting,
    hasSignOff,
    questionCount,
  };
}

function analyzeKeywords(text: string, expectedKeywords: string[]): { found: string[]; missing: string[] } {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  const missing: string[] = [];

  for (const keyword of expectedKeywords) {
    const keywordLower = keyword.toLowerCase();
    if (lowerText.includes(keywordLower)) {
      found.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  return { found, missing };
}

function generateChecks(
  text: string,
  game: Game,
  booleanAnalysis: BooleanAnalysis | undefined,
  outreachAnalysis: OutreachAnalysis | undefined,
  wordCount: number,
  thresholds: { min: number; optimal: number; max: number }
): RealtimeCheck[] {
  const checks: RealtimeCheck[] = [];

  // Universal checks
  if (wordCount === 0) {
    checks.push({
      id: 'empty',
      label: 'Content',
      passed: false,
      severity: 'error',
      message: 'Start typing your submission...',
    });
    return checks;
  }

  // Word count check
  if (wordCount < thresholds.min) {
    checks.push({
      id: 'word_count_low',
      label: 'Length',
      passed: false,
      severity: 'warning',
      message: `Too short (${wordCount}/${thresholds.min} min words)`,
    });
  } else if (wordCount > thresholds.max) {
    checks.push({
      id: 'word_count_high',
      label: 'Length',
      passed: false,
      severity: 'warning',
      message: `Consider shortening (${wordCount}/${thresholds.max} max words)`,
    });
  } else {
    checks.push({
      id: 'word_count_ok',
      label: 'Length',
      passed: true,
      severity: 'success',
      message: `Good length (${wordCount} words)`,
    });
  }

  // Boolean-specific checks
  if (booleanAnalysis) {
    // Operator usage
    if (booleanAnalysis.operatorCount === 0) {
      checks.push({
        id: 'no_operators',
        label: 'Boolean Operators',
        passed: false,
        severity: 'warning',
        message: 'No AND/OR/NOT operators detected',
      });
    } else {
      checks.push({
        id: 'has_operators',
        label: 'Boolean Operators',
        passed: true,
        severity: 'success',
        message: `Using ${booleanAnalysis.operatorCount} operator(s)`,
      });
    }

    // Parentheses balance
    if (!booleanAnalysis.isBalanced) {
      checks.push({
        id: 'unbalanced_parens',
        label: 'Syntax',
        passed: false,
        severity: 'error',
        message: 'Unbalanced parentheses detected',
      });
    } else if (booleanAnalysis.hasParentheses) {
      checks.push({
        id: 'balanced_parens',
        label: 'Syntax',
        passed: true,
        severity: 'success',
        message: 'Parentheses properly balanced',
      });
    }

    // Quotes for exact phrases
    if (booleanAnalysis.hasQuotes) {
      checks.push({
        id: 'has_quotes',
        label: 'Exact Phrases',
        passed: true,
        severity: 'success',
        message: 'Using quoted exact phrases',
      });
    }

    // Site operator
    if (booleanAnalysis.hasSiteOperator) {
      checks.push({
        id: 'has_site',
        label: 'Site Filter',
        passed: true,
        severity: 'success',
        message: 'Using site: operator',
      });
    }
  }

  // Outreach-specific checks
  if (outreachAnalysis) {
    // Personalization
    if (outreachAnalysis.hasPersonalization) {
      checks.push({
        id: 'has_personalization',
        label: 'Personalization',
        passed: true,
        severity: 'success',
        message: 'Contains personalization',
      });
    } else {
      checks.push({
        id: 'no_personalization',
        label: 'Personalization',
        passed: false,
        severity: 'warning',
        message: 'Add personalization for better response',
      });
    }

    // Call to action
    if (outreachAnalysis.hasCallToAction) {
      checks.push({
        id: 'has_cta',
        label: 'Call to Action',
        passed: true,
        severity: 'success',
        message: 'Has clear call to action',
      });
    } else {
      checks.push({
        id: 'no_cta',
        label: 'Call to Action',
        passed: false,
        severity: 'warning',
        message: 'Add a clear call to action',
      });
    }

    // Value proposition
    if (outreachAnalysis.hasValueProposition) {
      checks.push({
        id: 'has_value',
        label: 'Value Prop',
        passed: true,
        severity: 'success',
        message: 'Mentions opportunity/value',
      });
    }
  }

  return checks;
}

function generateTips(
  text: string,
  game: Game,
  booleanAnalysis: BooleanAnalysis | undefined,
  outreachAnalysis: OutreachAnalysis | undefined,
  wordCount: number,
  thresholds: { min: number; optimal: number; max: number },
  checks: RealtimeCheck[]
): ContextualTip[] {
  const tips: ContextualTip[] = [];
  const failedChecks = checks.filter(c => !c.passed);

  // Boolean tips
  if (booleanAnalysis) {
    if (!booleanAnalysis.hasOrOperator && wordCount > 5) {
      tips.push({
        id: 'tip_or_operator',
        message: 'Use OR to include synonyms/variations (e.g., "engineer OR developer")',
        type: 'suggestion',
        priority: 1,
        triggerCondition: 'no_or_operator',
      });
    }

    if (!booleanAnalysis.hasParentheses && booleanAnalysis.operatorCount >= 2) {
      tips.push({
        id: 'tip_parentheses',
        message: 'Group OR terms with parentheses: (term1 OR term2) AND term3',
        type: 'suggestion',
        priority: 2,
        triggerCondition: 'complex_no_parens',
      });
    }

    if (!booleanAnalysis.hasQuotes && /\s/.test(text)) {
      tips.push({
        id: 'tip_quotes',
        message: 'Use quotes for exact phrases: "software engineer"',
        type: 'hint',
        priority: 3,
        triggerCondition: 'no_quotes',
      });
    }

    if (booleanAnalysis.complexity === 'simple' && wordCount >= 10) {
      tips.push({
        id: 'tip_complexity',
        message: 'Consider adding more operators to refine your search',
        type: 'hint',
        priority: 4,
        triggerCondition: 'simple_complexity',
      });
    }
  }

  // Outreach tips
  if (outreachAnalysis) {
    if (!outreachAnalysis.hasPersonalization && wordCount >= 20) {
      tips.push({
        id: 'tip_personalize',
        message: 'Start with something specific about the candidate (their work, skills, etc.)',
        type: 'suggestion',
        priority: 1,
        triggerCondition: 'no_personalization',
      });
    }

    if (!outreachAnalysis.hasCallToAction && wordCount >= 50) {
      tips.push({
        id: 'tip_cta',
        message: 'End with a clear ask (e.g., "Would you be open to a quick chat?")',
        type: 'suggestion',
        priority: 2,
        triggerCondition: 'no_cta',
      });
    }

    if (outreachAnalysis.questionCount === 0 && wordCount >= 30) {
      tips.push({
        id: 'tip_question',
        message: 'Questions increase engagement - consider adding one',
        type: 'hint',
        priority: 3,
        triggerCondition: 'no_questions',
      });
    }

    if (outreachAnalysis.wordCountStatus === 'too_long') {
      tips.push({
        id: 'tip_shorten',
        message: 'Shorter messages get better response rates - aim for under 150 words',
        type: 'warning',
        priority: 1,
        triggerCondition: 'too_long',
      });
    }
  }

  // General tips
  if (wordCount > 0 && wordCount < thresholds.min * 0.5) {
    tips.push({
      id: 'tip_expand',
      message: `Keep going! Aim for at least ${thresholds.min} words`,
      type: 'encouragement',
      priority: 0,
      triggerCondition: 'very_short',
    });
  }

  // Sort by priority
  return tips.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

function estimateScoreRange(
  checks: RealtimeCheck[],
  wordCount: number,
  thresholds: { min: number; optimal: number; max: number },
  booleanAnalysis: BooleanAnalysis | undefined,
  outreachAnalysis: OutreachAnalysis | undefined
): { range: [number, number]; confidence: 'low' | 'medium' | 'high' } {
  if (wordCount === 0) {
    return { range: [0, 0], confidence: 'low' };
  }

  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  const passRate = totalChecks > 0 ? passedChecks / totalChecks : 0;

  // Base score from checks
  let baseMin = Math.round(passRate * 60);
  let baseMax = Math.round(passRate * 80 + 20);

  // Adjust for word count
  if (wordCount < thresholds.min) {
    const penalty = Math.min(20, (thresholds.min - wordCount) * 2);
    baseMin = Math.max(0, baseMin - penalty);
    baseMax = Math.max(baseMin + 10, baseMax - penalty);
  } else if (wordCount >= thresholds.optimal) {
    baseMin = Math.min(100, baseMin + 5);
  }

  // Adjust for boolean complexity
  if (booleanAnalysis) {
    if (booleanAnalysis.complexity === 'complex' && booleanAnalysis.isBalanced) {
      baseMin = Math.min(100, baseMin + 10);
      baseMax = Math.min(100, baseMax + 10);
    } else if (booleanAnalysis.complexity === 'simple') {
      baseMax = Math.min(baseMax, 75);
    }
    if (!booleanAnalysis.isBalanced) {
      baseMax = Math.min(baseMax, 50);
    }
  }

  // Adjust for outreach quality
  if (outreachAnalysis) {
    let outreachBonus = 0;
    if (outreachAnalysis.hasPersonalization) outreachBonus += 10;
    if (outreachAnalysis.hasCallToAction) outreachBonus += 10;
    if (outreachAnalysis.hasValueProposition) outreachBonus += 5;
    baseMin = Math.min(100, baseMin + outreachBonus * 0.5);
    baseMax = Math.min(100, baseMax + outreachBonus);
  }

  // Determine confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (wordCount < thresholds.min * 0.5) {
    confidence = 'low';
  } else if (wordCount >= thresholds.optimal && passRate >= 0.7) {
    confidence = 'high';
  }

  return {
    range: [Math.round(baseMin), Math.round(baseMax)],
    confidence,
  };
}

function determineOverallQuality(range: [number, number]): 'poor' | 'needs_work' | 'good' | 'excellent' {
  const avgScore = (range[0] + range[1]) / 2;

  if (avgScore >= 80) return 'excellent';
  if (avgScore >= 60) return 'good';
  if (avgScore >= 40) return 'needs_work';
  return 'poor';
}

function generateQualitySignals(
  wordCount: number,
  thresholds: { min: number; optimal: number; max: number },
  booleanAnalysis: BooleanAnalysis | undefined,
  outreachAnalysis: OutreachAnalysis | undefined,
  checks: RealtimeCheck[]
): QualitySignal[] {
  const signals: QualitySignal[] = [];

  // Word count signal
  let wcStatus: 'good' | 'warning' | 'error' = 'good';
  if (wordCount < thresholds.min) wcStatus = 'warning';
  if (wordCount === 0) wcStatus = 'error';

  signals.push({
    id: 'word_count',
    label: 'Words',
    status: wcStatus,
    value: wordCount,
  });

  // Pass rate signal
  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.filter(c => c.id !== 'empty').length;
  const passRate = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  signals.push({
    id: 'pass_rate',
    label: 'Checks',
    status: passRate >= 70 ? 'good' : passRate >= 40 ? 'warning' : 'error',
    value: `${passedChecks}/${totalChecks}`,
  });

  // Boolean complexity signal
  if (booleanAnalysis) {
    signals.push({
      id: 'complexity',
      label: 'Complexity',
      status: booleanAnalysis.complexity === 'complex' ? 'good' :
        booleanAnalysis.complexity === 'moderate' ? 'warning' : 'warning',
      value: booleanAnalysis.complexity,
    });
  }

  // Outreach personalization signal
  if (outreachAnalysis) {
    signals.push({
      id: 'personalization',
      label: 'Personal',
      status: outreachAnalysis.hasPersonalization ? 'good' : 'warning',
      value: outreachAnalysis.hasPersonalization ? 'Yes' : 'No',
    });
  }

  return signals;
}
