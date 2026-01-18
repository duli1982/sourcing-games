/**
 * Enhanced Scoring System
 *
 * Features:
 * - Structured output with Zod for reliable AI responses
 * - Ensemble scoring (AI + Validation + Embeddings)
 * - Multi-reference embedding comparison
 * - Anti-gaming detection
 * - Confidence-weighted scoring
 * - Cached embeddings for performance
 */

import { z } from 'zod';
import type { Game, RubricItem } from '../../types.js';

// Compatible validation result type that works with ServerValidationResult
export interface CompatibleValidationResult {
  score: number;
  checks?: Record<string, boolean>;
  feedback: string[];
  strengths: string[];
}

// ============================================================================
// SCHEMAS - Guaranteed structured output from AI
// ============================================================================

/**
 * Schema for individual rubric criterion scoring
 */
const RubricCriterionScoreSchema = z.object({
  points: z.number().min(0).describe('Points awarded for this criterion'),
  maxPoints: z.number().min(0).describe('Maximum possible points'),
  reasoning: z.string().min(10).max(300).describe('Brief explanation for the score'),
});

/**
 * Main scoring response schema - enforces consistent AI output
 */
export const ScoringResponseSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall score out of 100'),
  dimensions: z.object({
    technicalAccuracy: z.number().min(0).max(100),
    creativity: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
    bestPractices: z.number().min(0).max(100),
  }).describe('Multi-dimensional skill scores (0-100)'),
  skillsRadar: z.record(z.string(), z.number().min(0).max(100))
    .describe('Per-skill category scores (0-100)'),
  rubricBreakdown: z.record(z.string(), RubricCriterionScoreSchema)
    .describe('Score breakdown by rubric criterion'),
  strengths: z.array(z.string().min(5).max(200))
    .min(1).max(5)
    .describe('What the submission did well'),
  improvements: z.array(z.string().min(5).max(200))
    .min(1).max(5)
    .describe('Specific areas for improvement'),
  feedback: z.string().min(50).max(1500)
    .describe('Detailed feedback in HTML format'),
});

export type ScoringResponse = z.infer<typeof ScoringResponseSchema>;

// ============================================================================
// ENSEMBLE SCORING - Combines multiple scoring signals
// ============================================================================

export interface EnsembleScoreResult {
  finalScore: number;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  range: [number, number];
  components: {
    aiScore: number;
    aiWeight: number;
    validationScore: number;
    validationWeight: number;
    embeddingScore: number;
    embeddingWeight: number;
  };
  agreement: number; // How much the components agree (0-100)
}

/**
 * Calculate standard deviation for confidence estimation
 */
const standardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
};

/**
 * Ensemble scoring - weighted combination of AI, validation, and embedding scores
 *
 * Supports confidence-adjusted weighting: when AI confidence is low, the AI weight
 * can be reduced dynamically to rely more on validation and embedding scores.
 */
export const calculateEnsembleScore = (
  aiScore: number,
  validationScore: number,
  embeddingSimilarity: number, // 0-1 range
  options: {
    aiWeight?: number;
    validationWeight?: number;
    embeddingWeight?: number;
    hasExampleSolution?: boolean;
    // NEW: Confidence-adjusted weight override from consistency module
    adjustedAiWeight?: number;
    confidenceAdjustmentReason?: string;
  } = {}
): EnsembleScoreResult => {
  // Default weights - AI is primary, validation secondary, embedding tertiary
  // If adjustedAiWeight is provided (from consistency module), use it instead
  const baseAiWeight = options.adjustedAiWeight ?? options.aiWeight ?? 0.55;
  const {
    validationWeight = 0.30,
    embeddingWeight = options.hasExampleSolution ? 0.15 : 0,
    hasExampleSolution = true,
  } = options;

  // Use adjusted weight if provided, otherwise use base
  const aiWeight = baseAiWeight;

  // Normalize weights if no example solution
  const totalWeight = aiWeight + validationWeight + (hasExampleSolution ? embeddingWeight : 0);
  const normalizedAiWeight = aiWeight / totalWeight;
  const normalizedValidationWeight = validationWeight / totalWeight;
  const normalizedEmbeddingWeight = hasExampleSolution ? embeddingWeight / totalWeight : 0;

  // Convert embedding similarity to 0-100 scale
  const embeddingScore = embeddingSimilarity * 100;

  // Calculate weighted score
  const finalScore = Math.round(
    aiScore * normalizedAiWeight +
    validationScore * normalizedValidationWeight +
    embeddingScore * normalizedEmbeddingWeight
  );

  // Calculate agreement/confidence based on how close the scores are
  const scores = hasExampleSolution
    ? [aiScore, validationScore, embeddingScore]
    : [aiScore, validationScore];

  const stdDev = standardDeviation(scores);
  const agreement = Math.max(0, Math.round(100 - stdDev * 2));

  // Confidence is based on agreement + score range
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const scoreSpread = maxScore - minScore;

  const confidence = Math.max(0, Math.min(100, Math.round(
    100 - (stdDev * 1.5) - (scoreSpread * 0.3)
  )));

  const confidenceLevel: 'high' | 'medium' | 'low' =
    confidence >= 75 ? 'high' :
    confidence >= 50 ? 'medium' : 'low';

  // Calculate confidence interval
  const margin = Math.round(stdDev * 1.5);
  const range: [number, number] = [
    Math.max(0, finalScore - margin),
    Math.min(100, finalScore + margin)
  ];

  return {
    finalScore: Math.max(0, Math.min(100, finalScore)),
    confidence,
    confidenceLevel,
    range,
    components: {
      aiScore,
      aiWeight: normalizedAiWeight,
      validationScore,
      validationWeight: normalizedValidationWeight,
      embeddingScore,
      embeddingWeight: normalizedEmbeddingWeight,
    },
    agreement,
  };
};

// ============================================================================
// ANTI-GAMING DETECTION
// ============================================================================

export interface IntegrityCheck {
  isLikelyOriginal: boolean;
  overallRisk: 'low' | 'medium' | 'high';
  flags: string[];
  signals: {
    exampleCopyScore: number;      // 0-100, higher = more similar to example
    isExactCopy: boolean;          // >95% similarity to example
    isTooShort: boolean;           // Suspiciously short
    isTooFast: boolean;            // Submitted too quickly (if timing available)
    hasRepetitivePatterns: boolean; // Repeated phrases
    lowEffortIndicators: number;   // Count of low-effort signals
  };
}

/**
 * Detect potential gaming/cheating attempts
 */
export const checkSubmissionIntegrity = (
  submission: string,
  exampleSolution: string | undefined,
  embeddingSimilarity: number,
  options: {
    submissionTimeMs?: number; // How long they spent (if tracked)
    minExpectedTimeMs?: number; // Minimum expected time
  } = {}
): IntegrityCheck => {
  const flags: string[] = [];
  const signals = {
    exampleCopyScore: Math.round(embeddingSimilarity * 100),
    isExactCopy: false,
    isTooShort: false,
    isTooFast: false,
    hasRepetitivePatterns: false,
    lowEffortIndicators: 0,
  };

  // Check for exact copy of example solution
  if (exampleSolution) {
    const normalizedSubmission = submission.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedExample = exampleSolution.toLowerCase().replace(/\s+/g, ' ').trim();

    if (normalizedSubmission === normalizedExample) {
      signals.isExactCopy = true;
      flags.push('Exact copy of example solution detected');
    } else if (embeddingSimilarity > 0.95) {
      signals.isExactCopy = true;
      flags.push('Near-identical to example solution (>95% similarity)');
    }
  }

  // Check for suspiciously short submissions
  const wordCount = submission.trim().split(/\s+/).length;
  if (wordCount < 15) {
    signals.isTooShort = true;
    signals.lowEffortIndicators++;
    flags.push('Submission is very short (< 15 words)');
  }

  // Check for repetitive patterns (lazy copy-paste)
  const sentences = submission.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const uniqueSentences = new Set(sentences.map(s => s.toLowerCase().trim()));
  if (sentences.length > 3 && uniqueSentences.size < sentences.length * 0.6) {
    signals.hasRepetitivePatterns = true;
    signals.lowEffortIndicators++;
    flags.push('Contains repetitive content');
  }

  // Check for timing (if available)
  if (options.submissionTimeMs && options.minExpectedTimeMs) {
    if (options.submissionTimeMs < options.minExpectedTimeMs * 0.3) {
      signals.isTooFast = true;
      signals.lowEffortIndicators++;
      flags.push('Submitted unusually quickly');
    }
  }

  // Check for placeholder patterns that weren't filled in
  const placeholderPatterns = [
    /\[your (answer|response|name|company)\]/i,
    /\{(name|company|role)\}/i,
    /\.\.\.\s*$/,
    /^e\.g\.,?\s/i,
    /lorem ipsum/i,
    /xxx+/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(submission)) {
      signals.lowEffortIndicators++;
      flags.push('Contains unfilled placeholders');
      break;
    }
  }

  // Determine overall risk level
  let overallRisk: 'low' | 'medium' | 'high' = 'low';

  if (signals.isExactCopy) {
    overallRisk = 'high';
  } else if (signals.lowEffortIndicators >= 2 || embeddingSimilarity > 0.9) {
    overallRisk = 'medium';
  } else if (signals.lowEffortIndicators >= 1) {
    overallRisk = 'low';
  }

  return {
    isLikelyOriginal: overallRisk === 'low' && !signals.isExactCopy,
    overallRisk,
    flags,
    signals,
  };
};

// ============================================================================
// EMBEDDING CACHE - Performance optimization
// ============================================================================

// In-memory cache for example solution embeddings
const embeddingCache = new Map<string, number[]>();

/**
 * Get cached embedding or compute and cache
 */
export const getCachedEmbedding = async (
  gameId: string,
  text: string,
  computeEmbedding: (text: string) => Promise<number[]>
): Promise<number[]> => {
  const cacheKey = `${gameId}:${text.slice(0, 50)}`; // Key by game + text prefix

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const embedding = await computeEmbedding(text);
  embeddingCache.set(cacheKey, embedding);

  return embedding;
};

/**
 * Pre-warm the embedding cache for all games with example solutions
 */
export const warmEmbeddingCache = async (
  games: Game[],
  computeEmbedding: (text: string) => Promise<number[]>
): Promise<void> => {
  const gamesWithExamples = games.filter(g => g.exampleSolution);

  await Promise.all(
    gamesWithExamples.map(async (game) => {
      try {
        await getCachedEmbedding(game.id, game.exampleSolution!, computeEmbedding);
      } catch (error) {
        console.warn(`Failed to cache embedding for ${game.id}:`, error);
      }
    })
  );

  console.log(`Warmed embedding cache for ${gamesWithExamples.length} games`);
};

// ============================================================================
// MULTI-REFERENCE SCORING - Compare against multiple good answers
// ============================================================================

export interface MultiReferenceResult {
  averageSimilarity: number;
  bestMatchSimilarity: number;
  matchCount: number; // How many references scored >0.75
  percentileRank: number; // Where this submission ranks
}

/**
 * Score submission against multiple reference answers
 */
export const scoreAgainstMultipleReferences = (
  submissionEmbedding: number[],
  referenceEmbeddings: Array<{ embedding: number[]; score: number }>,
  cosineSimilarity: (a: number[], b: number[]) => number
): MultiReferenceResult => {
  if (referenceEmbeddings.length === 0) {
    return {
      averageSimilarity: 0,
      bestMatchSimilarity: 0,
      matchCount: 0,
      percentileRank: 50,
    };
  }

  const similarities = referenceEmbeddings.map(ref => ({
    similarity: cosineSimilarity(submissionEmbedding, ref.embedding),
    refScore: ref.score,
  }));

  const avgSimilarity = similarities.reduce((a, b) => a + b.similarity, 0) / similarities.length;
  const bestMatch = Math.max(...similarities.map(s => s.similarity));
  const goodMatches = similarities.filter(s => s.similarity > 0.75);

  // Estimate percentile based on similarity to high-scoring references
  const weightedScore = similarities.reduce((sum, s) => {
    // Weight by both similarity and the reference score
    return sum + (s.similarity * s.refScore);
  }, 0) / similarities.length;

  const percentileRank = Math.min(99, Math.max(1, Math.round(weightedScore)));

  return {
    averageSimilarity: avgSimilarity,
    bestMatchSimilarity: bestMatch,
    matchCount: goodMatches.length,
    percentileRank,
  };
};

// ============================================================================
// PROMPT GENERATION - Structured for Zod schema compliance
// ============================================================================

/**
 * Generate AI scoring prompt that enforces structured output
 * Now includes optional RAG context for domain-expert feedback
 */
export const generateScoringPrompt = (
  submission: string,
  game: Game,
  rubric: RubricItem[],
  validation: CompatibleValidationResult,
  playerSkillLevel: 'beginner' | 'intermediate' | 'expert',
  ragContext?: string // Optional RAG-retrieved domain knowledge
): string => {
  const rubricText = rubric.map(r =>
    `- ${r.criteria} (${r.points} pts): ${r.description}`
  ).join('\n');

  const rubricKeys = rubric.map(r => r.criteria).join(', ');

  // Build RAG section if context is provided
  const ragSection = ragContext ? `
## DOMAIN KNOWLEDGE (Use this to inform your evaluation)
${ragContext}

` : '';

  return `You are an expert AI coach for sourcing professionals. Score this submission fairly and provide actionable feedback.

## GAME CONTEXT
Title: ${game.title}
Task: ${game.task}
Difficulty: ${game.difficulty}
Skill Category: ${game.skillCategory}

## RUBRIC (Total: 100 points)
${rubricText}
${ragSection}
## AUTOMATED VALIDATION RESULTS
Score: ${validation.score}/100
Checks Passed: ${JSON.stringify(validation.checks)}
Issues Found: ${validation.feedback.length > 0 ? validation.feedback.join('; ') : 'None'}
Strengths: ${validation.strengths.length > 0 ? validation.strengths.join('; ') : 'None identified'}

## PLAYER SKILL LEVEL: ${playerSkillLevel.toUpperCase()}
Adjust your feedback depth:
- Beginner: Explain concepts, provide examples, be encouraging
- Intermediate: Focus on optimization and best practices
- Expert: Challenge with edge cases, suggest advanced techniques

## SUBMISSION TO SCORE
"${submission}"

## SCORING INSTRUCTIONS
1. Evaluate against EACH rubric criterion
2. Consider the automated validation results
3. ${ragContext ? 'Apply domain best practices from the knowledge base above' : 'Apply sourcing best practices'}
4. Award partial credit where appropriate
5. Be fair but not lenient - high scores must be earned
6. Provide specific, actionable feedback
${ragContext ? '7. Reference domain knowledge when explaining deductions or commending good practices' : ''}

## REQUIRED JSON OUTPUT FORMAT
You MUST respond with valid JSON matching this exact structure:
{
  "score": <number 0-100>,
  "dimensions": {
    "technicalAccuracy": <number 0-100>,
    "creativity": <number 0-100>,
    "completeness": <number 0-100>,
    "clarity": <number 0-100>,
    "bestPractices": <number 0-100>
  },
  "skillsRadar": {
    "${game.skillCategory}": <number 0-100>
  },
  "rubricBreakdown": {
    "${rubric[0]?.criteria || 'Criterion1'}": {
      "points": <number>,
      "maxPoints": ${rubric[0]?.points || 25},
      "reasoning": "<brief explanation>"
    },
    // ... one entry for each criterion: ${rubricKeys}
  },
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"],
  "feedback": "<detailed HTML feedback with <p>, <ul>, <li>, <strong> tags>"
}

IMPORTANT: Return ONLY valid JSON. No markdown fences, no explanatory text outside the JSON.`;
};

// ============================================================================
// FEEDBACK FORMATTING
// ============================================================================

/**
 * Format the ensemble score result into user-friendly HTML feedback
 */
export const formatEnsembleScoreFeedback = (
  ensemble: EnsembleScoreResult,
  integrity: IntegrityCheck
): string => {
  const confidenceColor =
    ensemble.confidenceLevel === 'high' ? '#10b981' :
    ensemble.confidenceLevel === 'medium' ? '#f59e0b' : '#ef4444';

  const confidenceIcon =
    ensemble.confidenceLevel === 'high' ? '✅' :
    ensemble.confidenceLevel === 'medium' ? '⚠️' : '❓';

  let html = `
<div style="background:#1e293b;padding:12px;border-radius:8px;border:1px solid #3b82f6;margin-bottom:12px;">
  <p><strong>📊 Ensemble Score Analysis</strong></p>
  <p style="font-size:1.2em;margin:8px 0;">
    Final Score: <strong style="color:#60a5fa;">${ensemble.finalScore}/100</strong>
    <span style="color:${confidenceColor};margin-left:12px;">${confidenceIcon} ${ensemble.confidence}% confidence</span>
  </p>
  <p style="font-size:0.9em;color:#94a3b8;">
    Range: ${ensemble.range[0]}-${ensemble.range[1]} | Agreement: ${ensemble.agreement}%
  </p>
  <details style="margin-top:8px;">
    <summary style="cursor:pointer;color:#93c5fd;">Score Components</summary>
    <ul style="margin-top:6px;font-size:0.9em;">
      <li>AI Evaluation: ${Math.round(ensemble.components.aiScore)} (${Math.round(ensemble.components.aiWeight * 100)}% weight)</li>
      <li>Rule-Based Validation: ${Math.round(ensemble.components.validationScore)} (${Math.round(ensemble.components.validationWeight * 100)}% weight)</li>
      ${ensemble.components.embeddingWeight > 0 ?
        `<li>Semantic Similarity: ${Math.round(ensemble.components.embeddingScore)} (${Math.round(ensemble.components.embeddingWeight * 100)}% weight)</li>` :
        ''}
    </ul>
  </details>
</div>`;

  // Add integrity warning if needed
  if (integrity.overallRisk !== 'low') {
    const riskColor = integrity.overallRisk === 'high' ? '#ef4444' : '#f59e0b';
    html += `
<div style="background:#1e293b;padding:10px;border-radius:8px;border:1px solid ${riskColor};margin-bottom:12px;">
  <p><strong>⚠️ Submission Notice</strong></p>
  <ul style="margin:6px 0;font-size:0.9em;">
    ${integrity.flags.map(f => `<li>${f}</li>`).join('')}
  </ul>
  <p style="font-size:0.85em;color:#94a3b8;">
    For the best learning experience, we encourage original responses that demonstrate your understanding.
  </p>
</div>`;
  }

  return html;
};

/**
 * Parse and validate AI response against Zod schema
 */
export const parseAiResponseWithSchema = (
  rawText: string
): { success: true; data: ScoringResponse } | { success: false; error: string } => {
  try {
    // Clean the response
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Find JSON object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      return { success: false, error: 'No JSON object found in response' };
    }

    const jsonSlice = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(jsonSlice);

    // Validate against schema
    const result = ScoringResponseSchema.safeParse(parsed);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      // Zod v4 uses .issues instead of .errors
      const issues = (result.error as any).issues || (result.error as any).errors || [];
      const errorMessages = issues.map((e: any) =>
        `${(e.path || []).join('.')}: ${e.message}`
      ).join('; ');
      return { success: false, error: `Schema validation failed: ${errorMessages}` };
    }
  } catch (error) {
    return {
      success: false,
      error: `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// ============================================================================
// MAIN ENHANCED SCORING FUNCTION
// ============================================================================

export interface EnhancedScoringInput {
  submission: string;
  game: Game;
  rubric: RubricItem[];
  validation: CompatibleValidationResult;
  aiScore: number;
  aiFeedback: string;
  embeddingSimilarity: number;
  playerSkillLevel: 'beginner' | 'intermediate' | 'expert';
  // NEW: Consistency module parameters
  consistencyParams?: {
    adjustedAiWeight?: number;
    confidenceLevel?: 'high' | 'medium' | 'low' | 'very_low';
    consistencyFlags?: string[];
    crossValidationAdjustment?: number;
    consistencyFeedback?: string;
  };
}

export interface EnhancedScoringResult {
  finalScore: number;
  feedback: string;
  ensemble: EnsembleScoreResult;
  integrity: IntegrityCheck;
  metadata: {
    scoringVersion: string;
    timestamp: string;
    components: {
      ai: number;
      validation: number;
      embedding: number;
    };
  };
}

/**
 * Main enhanced scoring function - combines all scoring signals
 *
 * Now supports consistency module integration for:
 * - Confidence-adjusted AI weighting
 * - Cross-model validation adjustments
 * - Consistency feedback
 */
export const calculateEnhancedScore = (
  input: EnhancedScoringInput
): EnhancedScoringResult => {
  const {
    submission,
    game,
    validation,
    aiScore,
    aiFeedback,
    embeddingSimilarity,
    consistencyParams,
  } = input;

  // 1. Check submission integrity
  const integrity = checkSubmissionIntegrity(
    submission,
    game.exampleSolution,
    embeddingSimilarity
  );

  // 2. Apply cross-validation adjustment if provided
  let adjustedAiScore = aiScore;
  if (consistencyParams?.crossValidationAdjustment) {
    adjustedAiScore = aiScore + consistencyParams.crossValidationAdjustment;
    adjustedAiScore = Math.max(0, Math.min(100, adjustedAiScore));
  }

  // 3. Calculate ensemble score with optional confidence-adjusted weighting
  const ensemble = calculateEnsembleScore(
    adjustedAiScore,
    validation.score,
    embeddingSimilarity,
    {
      hasExampleSolution: !!game.exampleSolution,
      // Use adjusted AI weight from consistency module if provided
      adjustedAiWeight: consistencyParams?.adjustedAiWeight,
    }
  );

  // 3. Apply integrity penalties if needed
  let adjustedScore = ensemble.finalScore;

  if (integrity.signals.isExactCopy) {
    // Severe penalty for copying example solution
    adjustedScore = Math.min(adjustedScore, 50);
  } else if (integrity.overallRisk === 'high') {
    adjustedScore = Math.round(adjustedScore * 0.85); // 15% penalty
  } else if (integrity.overallRisk === 'medium') {
    adjustedScore = Math.round(adjustedScore * 0.95); // 5% penalty
  }

  // 4. Prevent perfect scores unless everything is perfect
  if (adjustedScore === 100) {
    if (validation.score < 100 || embeddingSimilarity < 0.95) {
      adjustedScore = 99;
    }
  }

  // 5. Format combined feedback
  const ensembleFeedback = formatEnsembleScoreFeedback(ensemble, integrity);

  // Include consistency feedback if provided
  const consistencyFeedback = consistencyParams?.consistencyFeedback || '';

  const combinedFeedback = consistencyFeedback + ensembleFeedback + aiFeedback;

  return {
    finalScore: Math.max(0, Math.min(100, adjustedScore)),
    feedback: combinedFeedback,
    ensemble,
    integrity,
    metadata: {
      scoringVersion: '2.0.0',
      timestamp: new Date().toISOString(),
      components: {
        ai: aiScore,
        validation: validation.score,
        embedding: Math.round(embeddingSimilarity * 100),
      },
    },
  };
};

export default {
  ScoringResponseSchema,
  calculateEnsembleScore,
  checkSubmissionIntegrity,
  getCachedEmbedding,
  warmEmbeddingCache,
  scoreAgainstMultipleReferences,
  generateScoringPrompt,
  formatEnsembleScoreFeedback,
  parseAiResponseWithSchema,
  calculateEnhancedScore,
};
