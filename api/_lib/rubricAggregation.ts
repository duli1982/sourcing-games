/**
 * Rubric Score Aggregation & Validation
 *
 * Validates AI rubric scoring for consistency and accuracy:
 * - Validates AI rubric criteria names match game's rubric
 * - Checks that points don't exceed maxPoints per criterion
 * - Compares sum of rubric points to overall score
 * - Flags discrepancies for review or auto-correction
 */

import type { RubricItem } from '../../types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RubricCriterionScore {
  points: number;
  maxPoints: number;
  reasoning: string;
}

export interface AiRubricBreakdown {
  [criteriaName: string]: RubricCriterionScore;
}

export interface RubricValidationResult {
  isValid: boolean;
  issues: RubricValidationIssue[];
  warnings: string[];
  correctedBreakdown: AiRubricBreakdown | null;
  correctedScore: number | null;
  aggregation: RubricAggregation;
}

export interface RubricValidationIssue {
  type: 'missing_criterion' | 'extra_criterion' | 'exceeds_max' | 'negative_points' | 'score_mismatch' | 'invalid_max';
  severity: 'error' | 'warning';
  criterion?: string;
  message: string;
  expected?: number;
  actual?: number;
}

export interface RubricAggregation {
  totalPointsAwarded: number;
  totalMaxPoints: number;
  percentageScore: number;
  criteriaCount: number;
  matchedCriteria: number;
  unmatchedCriteria: string[];
}

export interface RubricValidationConfig {
  /** Allow AI to use slightly different criterion names (fuzzy matching) */
  allowFuzzyMatch: boolean;
  /** Maximum allowed difference between rubric sum and overall score */
  maxScoreDivergence: number;
  /** Auto-correct points that exceed maxPoints */
  autoCorrectExceedingPoints: boolean;
  /** Auto-correct overall score to match rubric sum */
  autoCorrectScoreMismatch: boolean;
  /** Fuzzy match threshold (0-1, higher = stricter) */
  fuzzyMatchThreshold: number;
}

export const DEFAULT_RUBRIC_VALIDATION_CONFIG: RubricValidationConfig = {
  allowFuzzyMatch: true,
  maxScoreDivergence: 5, // Allow up to 5 points difference
  autoCorrectExceedingPoints: true,
  autoCorrectScoreMismatch: false, // Only warn, don't auto-correct score
  fuzzyMatchThreshold: 0.7,
};

// ============================================================================
// FUZZY MATCHING UTILITIES
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calculate similarity between two strings (0-1)
 */
const stringSimilarity = (a: string, b: string): number => {
  const normalizedA = a.toLowerCase().trim();
  const normalizedB = b.toLowerCase().trim();

  if (normalizedA === normalizedB) return 1;

  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  return 1 - distance / maxLength;
};

/**
 * Find best matching criterion from game rubric
 */
const findBestMatch = (
  aiCriterion: string,
  gameRubric: RubricItem[],
  threshold: number
): { match: RubricItem | null; similarity: number } => {
  let bestMatch: RubricItem | null = null;
  let bestSimilarity = 0;

  for (const rubricItem of gameRubric) {
    const similarity = stringSimilarity(aiCriterion, rubricItem.criteria);

    // Also check if AI criterion contains the rubric criterion or vice versa
    const containsMatch =
      aiCriterion.toLowerCase().includes(rubricItem.criteria.toLowerCase()) ||
      rubricItem.criteria.toLowerCase().includes(aiCriterion.toLowerCase());

    const effectiveSimilarity = containsMatch ? Math.max(similarity, 0.85) : similarity;

    if (effectiveSimilarity > bestSimilarity) {
      bestSimilarity = effectiveSimilarity;
      bestMatch = rubricItem;
    }
  }

  return {
    match: bestSimilarity >= threshold ? bestMatch : null,
    similarity: bestSimilarity,
  };
};

// ============================================================================
// MAIN VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate AI rubric breakdown against game's rubric definition
 */
export const validateRubricBreakdown = (
  aiBreakdown: AiRubricBreakdown,
  gameRubric: RubricItem[],
  aiOverallScore: number,
  config: RubricValidationConfig = DEFAULT_RUBRIC_VALIDATION_CONFIG
): RubricValidationResult => {
  const issues: RubricValidationIssue[] = [];
  const warnings: string[] = [];
  const correctedBreakdown: AiRubricBreakdown = {};

  // Track which game rubric criteria have been matched
  const matchedGameCriteria = new Set<string>();
  const unmatchedAiCriteria: string[] = [];

  // Map AI criteria to game criteria
  const criteriaMapping = new Map<string, RubricItem>();

  // ===== 1. VALIDATE CRITERIA NAMES =====
  for (const [aiCriterion, aiScore] of Object.entries(aiBreakdown)) {
    // Try exact match first
    const exactMatch = gameRubric.find(
      r => r.criteria.toLowerCase() === aiCriterion.toLowerCase()
    );

    if (exactMatch) {
      criteriaMapping.set(aiCriterion, exactMatch);
      matchedGameCriteria.add(exactMatch.criteria);
    } else if (config.allowFuzzyMatch) {
      // Try fuzzy match
      const { match, similarity } = findBestMatch(
        aiCriterion,
        gameRubric.filter(r => !matchedGameCriteria.has(r.criteria)),
        config.fuzzyMatchThreshold
      );

      if (match) {
        criteriaMapping.set(aiCriterion, match);
        matchedGameCriteria.add(match.criteria);
        warnings.push(
          `Fuzzy matched "${aiCriterion}" → "${match.criteria}" (${Math.round(similarity * 100)}% similarity)`
        );
      } else {
        unmatchedAiCriteria.push(aiCriterion);
        issues.push({
          type: 'extra_criterion',
          severity: 'warning',
          criterion: aiCriterion,
          message: `AI used criterion "${aiCriterion}" which doesn't match any game rubric criterion`,
        });
      }
    } else {
      unmatchedAiCriteria.push(aiCriterion);
      issues.push({
        type: 'extra_criterion',
        severity: 'warning',
        criterion: aiCriterion,
        message: `AI used criterion "${aiCriterion}" which doesn't match any game rubric criterion`,
      });
    }
  }

  // Check for missing criteria
  for (const rubricItem of gameRubric) {
    if (!matchedGameCriteria.has(rubricItem.criteria)) {
      issues.push({
        type: 'missing_criterion',
        severity: 'error',
        criterion: rubricItem.criteria,
        message: `AI did not score criterion "${rubricItem.criteria}"`,
        expected: rubricItem.points,
      });
    }
  }

  // ===== 2. VALIDATE POINTS PER CRITERION =====
  let totalPointsAwarded = 0;
  let totalMaxPoints = 0;

  for (const [aiCriterion, aiScore] of Object.entries(aiBreakdown)) {
    const mappedRubric = criteriaMapping.get(aiCriterion);
    const expectedMax = mappedRubric?.points ?? aiScore.maxPoints;

    // Use the criterion name from game rubric if matched, otherwise use AI's name
    const criterionName = mappedRubric?.criteria ?? aiCriterion;

    // Check for negative points
    if (aiScore.points < 0) {
      issues.push({
        type: 'negative_points',
        severity: 'error',
        criterion: criterionName,
        message: `Negative points (${aiScore.points}) for "${criterionName}"`,
        actual: aiScore.points,
      });

      // Correct to 0
      correctedBreakdown[criterionName] = {
        ...aiScore,
        points: 0,
        maxPoints: expectedMax,
      };
      totalMaxPoints += expectedMax;
      continue;
    }

    // Check if points exceed maxPoints
    if (aiScore.points > expectedMax) {
      issues.push({
        type: 'exceeds_max',
        severity: 'error',
        criterion: criterionName,
        message: `Points awarded (${aiScore.points}) exceeds max (${expectedMax}) for "${criterionName}"`,
        expected: expectedMax,
        actual: aiScore.points,
      });

      if (config.autoCorrectExceedingPoints) {
        correctedBreakdown[criterionName] = {
          ...aiScore,
          points: expectedMax,
          maxPoints: expectedMax,
          reasoning: aiScore.reasoning + ' [Points capped to max]',
        };
        totalPointsAwarded += expectedMax;
      } else {
        correctedBreakdown[criterionName] = { ...aiScore, maxPoints: expectedMax };
        totalPointsAwarded += aiScore.points;
      }
    } else {
      correctedBreakdown[criterionName] = { ...aiScore, maxPoints: expectedMax };
      totalPointsAwarded += aiScore.points;
    }

    totalMaxPoints += expectedMax;

    // Check if AI's maxPoints matches game's maxPoints
    if (mappedRubric && aiScore.maxPoints !== mappedRubric.points) {
      issues.push({
        type: 'invalid_max',
        severity: 'warning',
        criterion: criterionName,
        message: `AI used maxPoints=${aiScore.maxPoints} but game rubric specifies ${mappedRubric.points}`,
        expected: mappedRubric.points,
        actual: aiScore.maxPoints,
      });
    }
  }

  // Add missing criteria with 0 points
  for (const rubricItem of gameRubric) {
    if (!matchedGameCriteria.has(rubricItem.criteria)) {
      correctedBreakdown[rubricItem.criteria] = {
        points: 0,
        maxPoints: rubricItem.points,
        reasoning: '[Not scored by AI - defaulted to 0]',
      };
      totalMaxPoints += rubricItem.points;
    }
  }

  // ===== 3. COMPARE RUBRIC SUM TO OVERALL SCORE =====
  const percentageScore = totalMaxPoints > 0
    ? Math.round((totalPointsAwarded / totalMaxPoints) * 100)
    : 0;

  const scoreDivergence = Math.abs(percentageScore - aiOverallScore);

  let correctedScore: number | null = null;

  if (scoreDivergence > config.maxScoreDivergence) {
    issues.push({
      type: 'score_mismatch',
      severity: 'warning',
      message: `Rubric sum (${totalPointsAwarded}/${totalMaxPoints} = ${percentageScore}%) differs from AI overall score (${aiOverallScore}) by ${scoreDivergence} points`,
      expected: percentageScore,
      actual: aiOverallScore,
    });

    if (config.autoCorrectScoreMismatch) {
      correctedScore = percentageScore;
      warnings.push(`Auto-corrected overall score from ${aiOverallScore} to ${percentageScore} based on rubric sum`);
    }
  }

  // ===== 4. BUILD RESULT =====
  const aggregation: RubricAggregation = {
    totalPointsAwarded,
    totalMaxPoints,
    percentageScore,
    criteriaCount: gameRubric.length,
    matchedCriteria: matchedGameCriteria.size,
    unmatchedCriteria: unmatchedAiCriteria,
  };

  const hasErrors = issues.some(i => i.severity === 'error');

  return {
    isValid: !hasErrors,
    issues,
    warnings,
    correctedBreakdown: Object.keys(correctedBreakdown).length > 0 ? correctedBreakdown : null,
    correctedScore,
    aggregation,
  };
};

/**
 * Format rubric validation feedback as HTML for user display
 */
export const formatRubricValidationFeedback = (
  result: RubricValidationResult,
  showDetails: boolean = false
): string => {
  if (result.issues.length === 0 && result.warnings.length === 0) {
    return ''; // No issues to display
  }

  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');

  let html = '';

  if (showDetails && (errors.length > 0 || warnings.length > 0)) {
    html += `
<div style="background:#1e293b;padding:10px;border-radius:8px;border:1px solid #64748b;margin-bottom:12px;font-size:0.9em;">
  <details>
    <summary style="cursor:pointer;color:#94a3b8;">📊 Rubric Scoring Details</summary>
    <div style="margin-top:8px;">
      <p style="color:#94a3b8;margin-bottom:6px;">
        Rubric Sum: <strong>${result.aggregation.totalPointsAwarded}/${result.aggregation.totalMaxPoints}</strong>
        (${result.aggregation.percentageScore}%)
      </p>
      <p style="color:#94a3b8;margin-bottom:6px;">
        Criteria Matched: ${result.aggregation.matchedCriteria}/${result.aggregation.criteriaCount}
      </p>`;

    if (errors.length > 0) {
      html += `
      <p style="color:#f87171;margin-top:8px;"><strong>Issues:</strong></p>
      <ul style="color:#fca5a5;font-size:0.9em;">
        ${errors.map(e => `<li>${e.message}</li>`).join('')}
      </ul>`;
    }

    if (warnings.length > 0) {
      html += `
      <p style="color:#fbbf24;margin-top:8px;"><strong>Notes:</strong></p>
      <ul style="color:#fde047;font-size:0.9em;">
        ${warnings.map(w => `<li>${w.message}</li>`).join('')}
      </ul>`;
    }

    if (result.warnings.length > 0) {
      html += `
      <p style="color:#94a3b8;margin-top:8px;font-style:italic;">
        ${result.warnings.join('<br/>')}
      </p>`;
    }

    html += `
    </div>
  </details>
</div>`;
  }

  return html;
};

/**
 * Calculate corrected score based on rubric aggregation
 * Uses weighted combination of AI score and rubric-derived score
 */
export const calculateCorrectedScore = (
  aiOverallScore: number,
  rubricValidation: RubricValidationResult,
  config: {
    /** Weight given to rubric-derived score (0-1) */
    rubricWeight: number;
    /** Only apply correction if divergence exceeds this threshold */
    divergenceThreshold: number;
  } = { rubricWeight: 0.3, divergenceThreshold: 10 }
): { score: number; wasAdjusted: boolean; adjustment: number } => {
  const rubricScore = rubricValidation.aggregation.percentageScore;
  const divergence = Math.abs(rubricScore - aiOverallScore);

  if (divergence <= config.divergenceThreshold) {
    return {
      score: aiOverallScore,
      wasAdjusted: false,
      adjustment: 0,
    };
  }

  // Blend AI score with rubric score
  const correctedScore = Math.round(
    aiOverallScore * (1 - config.rubricWeight) +
    rubricScore * config.rubricWeight
  );

  return {
    score: Math.max(0, Math.min(100, correctedScore)),
    wasAdjusted: true,
    adjustment: correctedScore - aiOverallScore,
  };
};

/**
 * Get rubric breakdown summary for analytics
 */
export const getRubricBreakdownSummary = (
  breakdown: AiRubricBreakdown
): {
  criterionScores: Array<{ name: string; score: number; maxScore: number; percentage: number }>;
  lowestCriterion: string | null;
  highestCriterion: string | null;
  averagePercentage: number;
} => {
  const criterionScores = Object.entries(breakdown).map(([name, data]) => ({
    name,
    score: data.points,
    maxScore: data.maxPoints,
    percentage: data.maxPoints > 0 ? Math.round((data.points / data.maxPoints) * 100) : 0,
  }));

  if (criterionScores.length === 0) {
    return {
      criterionScores: [],
      lowestCriterion: null,
      highestCriterion: null,
      averagePercentage: 0,
    };
  }

  const sortedByPercentage = [...criterionScores].sort((a, b) => a.percentage - b.percentage);

  return {
    criterionScores,
    lowestCriterion: sortedByPercentage[0].name,
    highestCriterion: sortedByPercentage[sortedByPercentage.length - 1].name,
    averagePercentage: Math.round(
      criterionScores.reduce((sum, c) => sum + c.percentage, 0) / criterionScores.length
    ),
  };
};

export default {
  validateRubricBreakdown,
  formatRubricValidationFeedback,
  calculateCorrectedScore,
  getRubricBreakdownSummary,
  DEFAULT_RUBRIC_VALIDATION_CONFIG,
};
