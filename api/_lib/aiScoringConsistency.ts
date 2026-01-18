/**
 * AI Scoring Consistency Module
 *
 * Implements advanced techniques to improve AI scoring reliability:
 * 1. Temperature variation sampling - Score 2-3 times with different temperatures, take median
 * 2. Confidence-adjusted weighting - Lower AI weight when confidence is low
 * 3. Cross-model validation - Use secondary model for high-stakes scores
 *
 * @version 1.0.0
 */

import { GoogleGenAI } from '@google/genai';

// ============================================================================
// Types
// ============================================================================

export interface MultiSampleConfig {
  enabled: boolean;
  sampleCount: 2 | 3;
  temperatures: number[];
  useMedian: boolean;
  maxVarianceForConfidence: number; // If variance exceeds this, lower confidence
}

export interface CrossValidationConfig {
  enabled: boolean;
  primaryModel: string;
  secondaryModel: string;
  highStakesThreshold: number; // Score threshold above which to cross-validate
  maxScoreDivergence: number; // Max acceptable difference between models
  useAverageOnDivergence: boolean;
}

export interface ConfidenceAdjustmentConfig {
  enabled: boolean;
  lowConfidenceThreshold: number; // Below this, reduce AI weight
  veryLowConfidenceThreshold: number; // Below this, significantly reduce AI weight
  lowConfidenceWeightMultiplier: number; // Multiply AI weight by this when low confidence
  veryLowConfidenceWeightMultiplier: number; // Multiply AI weight by this when very low confidence
}

export interface ScoringConsistencyConfig {
  multiSample: MultiSampleConfig;
  crossValidation: CrossValidationConfig;
  confidenceAdjustment: ConfidenceAdjustmentConfig;
}

export interface SingleSampleResult {
  score: number;
  temperature: number;
  responseText: string;
  processingTimeMs: number;
}

export interface MultiSampleResult {
  samples: SingleSampleResult[];
  medianScore: number;
  meanScore: number;
  variance: number;
  standardDeviation: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'very_low';
  selectedScore: number;
  selectionMethod: 'median' | 'mean' | 'single';
}

export interface CrossValidationResult {
  primaryScore: number;
  primaryModel: string;
  secondaryScore: number | null;
  secondaryModel: string | null;
  divergence: number;
  wasValidated: boolean;
  validationPassed: boolean;
  finalScore: number;
  adjustmentReason: string | null;
}

export interface ConsistencyResult {
  originalScore: number;
  adjustedScore: number;
  multiSample: MultiSampleResult | null;
  crossValidation: CrossValidationResult | null;
  adjustedAiWeight: number;
  originalAiWeight: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'very_low';
  consistencyFlags: string[];
  processingTimeMs: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_CONSISTENCY_CONFIG: ScoringConsistencyConfig = {
  multiSample: {
    enabled: true,
    sampleCount: 2, // Default to 2 samples for balance of accuracy vs latency
    temperatures: [0.3, 0.5], // Slight temperature variation
    useMedian: true,
    maxVarianceForConfidence: 100, // Variance of 100 = 10 point std dev
  },
  crossValidation: {
    enabled: true,
    primaryModel: 'gemini-2.5-flash',
    secondaryModel: 'gemini-2.5-flash-lite',
    highStakesThreshold: 85, // Cross-validate scores 85+
    maxScoreDivergence: 15, // Flag if models differ by more than 15 points
    useAverageOnDivergence: true,
  },
  confidenceAdjustment: {
    enabled: true,
    lowConfidenceThreshold: 60, // Below 60% confidence
    veryLowConfidenceThreshold: 40, // Below 40% confidence
    lowConfidenceWeightMultiplier: 0.8, // Reduce AI weight by 20%
    veryLowConfidenceWeightMultiplier: 0.6, // Reduce AI weight by 40%
  },
};

// ============================================================================
// Multi-Sample Scoring
// ============================================================================

/**
 * Score a submission multiple times with different temperatures and aggregate
 */
export async function multiSampleScore(
  ai: GoogleGenAI,
  prompt: string,
  model: string,
  responseSchema: object,
  parseFunction: (text: string) => { score: number; feedback: string },
  config: MultiSampleConfig = DEFAULT_CONSISTENCY_CONFIG.multiSample
): Promise<MultiSampleResult> {
  if (!config.enabled) {
    // Return placeholder for disabled multi-sample
    return {
      samples: [],
      medianScore: 0,
      meanScore: 0,
      variance: 0,
      standardDeviation: 0,
      confidenceLevel: 'high',
      selectedScore: 0,
      selectionMethod: 'single',
    };
  }

  const samples: SingleSampleResult[] = [];
  const temperatures = config.temperatures.slice(0, config.sampleCount);

  // Run samples in parallel for efficiency
  const samplePromises = temperatures.map(async (temperature) => {
    const startTime = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature,
          maxOutputTokens: 800,
          candidateCount: 1,
          responseMimeType: 'application/json',
          responseSchema,
        },
      } as any);

      const responseText = extractText(response);
      if (!responseText) {
        throw new Error('Empty response');
      }

      const parsed = parseFunction(responseText);
      return {
        score: parsed.score,
        temperature,
        responseText,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.warn(`Multi-sample scoring failed for temperature ${temperature}:`, error);
      return null;
    }
  });

  const results = await Promise.all(samplePromises);

  // Filter out failed samples
  for (const result of results) {
    if (result) {
      samples.push(result);
    }
  }

  if (samples.length === 0) {
    return {
      samples: [],
      medianScore: 0,
      meanScore: 0,
      variance: 0,
      standardDeviation: 0,
      confidenceLevel: 'very_low',
      selectedScore: 0,
      selectionMethod: 'single',
    };
  }

  // Calculate statistics
  const scores = samples.map(s => s.score);
  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Sort for median
  const sortedScores = [...scores].sort((a, b) => a - b);
  const medianScore = sortedScores.length % 2 === 0
    ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
    : sortedScores[Math.floor(sortedScores.length / 2)];

  // Calculate variance
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);

  // Determine confidence level based on variance
  let confidenceLevel: 'high' | 'medium' | 'low' | 'very_low' = 'high';
  if (variance > config.maxVarianceForConfidence * 2) {
    confidenceLevel = 'very_low';
  } else if (variance > config.maxVarianceForConfidence) {
    confidenceLevel = 'low';
  } else if (variance > config.maxVarianceForConfidence / 2) {
    confidenceLevel = 'medium';
  }

  const selectedScore = config.useMedian ? Math.round(medianScore) : Math.round(meanScore);

  return {
    samples,
    medianScore: Math.round(medianScore),
    meanScore: Math.round(meanScore),
    variance: Math.round(variance * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    confidenceLevel,
    selectedScore,
    selectionMethod: config.useMedian ? 'median' : 'mean',
  };
}

// ============================================================================
// Cross-Model Validation
// ============================================================================

/**
 * Validate high-stakes scores using a secondary model
 */
export async function crossValidateScore(
  ai: GoogleGenAI,
  prompt: string,
  primaryScore: number,
  responseSchema: object,
  parseFunction: (text: string) => { score: number; feedback: string },
  config: CrossValidationConfig = DEFAULT_CONSISTENCY_CONFIG.crossValidation
): Promise<CrossValidationResult> {
  // Check if cross-validation is needed
  if (!config.enabled || primaryScore < config.highStakesThreshold) {
    return {
      primaryScore,
      primaryModel: config.primaryModel,
      secondaryScore: null,
      secondaryModel: null,
      divergence: 0,
      wasValidated: false,
      validationPassed: true,
      finalScore: primaryScore,
      adjustmentReason: null,
    };
  }

  console.log(`Cross-validating high-stakes score ${primaryScore} with ${config.secondaryModel}`);

  try {
    // Run secondary model
    const response = await ai.models.generateContent({
      model: config.secondaryModel,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.35, // Match primary temperature
        maxOutputTokens: 800,
        candidateCount: 1,
        responseMimeType: 'application/json',
        responseSchema,
      },
    } as any);

    const responseText = extractText(response);
    if (!responseText) {
      throw new Error('Empty cross-validation response');
    }

    const parsed = parseFunction(responseText);
    const secondaryScore = parsed.score;
    const divergence = Math.abs(primaryScore - secondaryScore);

    let finalScore = primaryScore;
    let validationPassed = true;
    let adjustmentReason: string | null = null;

    if (divergence > config.maxScoreDivergence) {
      validationPassed = false;
      if (config.useAverageOnDivergence) {
        finalScore = Math.round((primaryScore + secondaryScore) / 2);
        adjustmentReason = `Models diverged by ${divergence} points (${primaryScore} vs ${secondaryScore}), using average`;
      } else {
        // Use the lower score for safety
        finalScore = Math.min(primaryScore, secondaryScore);
        adjustmentReason = `Models diverged by ${divergence} points, using lower score for fairness`;
      }
      console.warn(`Cross-validation divergence: primary=${primaryScore}, secondary=${secondaryScore}, final=${finalScore}`);
    }

    return {
      primaryScore,
      primaryModel: config.primaryModel,
      secondaryScore,
      secondaryModel: config.secondaryModel,
      divergence,
      wasValidated: true,
      validationPassed,
      finalScore,
      adjustmentReason,
    };
  } catch (error) {
    console.warn('Cross-validation failed:', error);
    return {
      primaryScore,
      primaryModel: config.primaryModel,
      secondaryScore: null,
      secondaryModel: config.secondaryModel,
      divergence: 0,
      wasValidated: false,
      validationPassed: true, // Assume valid if we can't cross-validate
      finalScore: primaryScore,
      adjustmentReason: 'Cross-validation failed, using primary score',
    };
  }
}

// ============================================================================
// Confidence-Adjusted Weighting
// ============================================================================

/**
 * Adjust AI weight based on confidence level
 */
export function adjustAiWeightForConfidence(
  baseAiWeight: number,
  confidenceLevel: 'high' | 'medium' | 'low' | 'very_low',
  ensembleConfidence: number,
  config: ConfidenceAdjustmentConfig = DEFAULT_CONSISTENCY_CONFIG.confidenceAdjustment
): { adjustedWeight: number; reason: string | null } {
  if (!config.enabled) {
    return { adjustedWeight: baseAiWeight, reason: null };
  }

  let adjustedWeight = baseAiWeight;
  let reason: string | null = null;

  // Adjust based on confidence level from multi-sampling
  if (confidenceLevel === 'very_low') {
    adjustedWeight = baseAiWeight * config.veryLowConfidenceWeightMultiplier;
    reason = `AI weight reduced due to very low multi-sample confidence (${confidenceLevel})`;
  } else if (confidenceLevel === 'low') {
    adjustedWeight = baseAiWeight * config.lowConfidenceWeightMultiplier;
    reason = `AI weight reduced due to low multi-sample confidence (${confidenceLevel})`;
  }

  // Also adjust based on ensemble confidence (AI-validation agreement)
  if (ensembleConfidence < config.veryLowConfidenceThreshold) {
    const additionalReduction = config.veryLowConfidenceWeightMultiplier;
    adjustedWeight = adjustedWeight * additionalReduction;
    reason = reason
      ? `${reason}; also low ensemble confidence (${ensembleConfidence}%)`
      : `AI weight reduced due to low ensemble confidence (${ensembleConfidence}%)`;
  } else if (ensembleConfidence < config.lowConfidenceThreshold) {
    const additionalReduction = config.lowConfidenceWeightMultiplier;
    adjustedWeight = adjustedWeight * additionalReduction;
    reason = reason
      ? `${reason}; also medium ensemble confidence (${ensembleConfidence}%)`
      : `AI weight reduced due to medium ensemble confidence (${ensembleConfidence}%)`;
  }

  return { adjustedWeight: Math.max(0.2, adjustedWeight), reason }; // Never go below 20% AI weight
}

// ============================================================================
// Main Consistency Function
// ============================================================================

/**
 * Apply all consistency checks to an AI score
 * This is the main entry point for the consistency module
 */
export async function applyConsistencyChecks(
  ai: GoogleGenAI,
  prompt: string,
  initialScore: number,
  initialFeedback: string,
  responseSchema: object,
  parseFunction: (text: string) => { score: number; feedback: string },
  ensembleConfidence: number,
  baseAiWeight: number,
  config: ScoringConsistencyConfig = DEFAULT_CONSISTENCY_CONFIG
): Promise<ConsistencyResult> {
  const startTime = Date.now();
  const consistencyFlags: string[] = [];

  let currentScore = initialScore;
  let multiSampleResult: MultiSampleResult | null = null;
  let crossValidationResult: CrossValidationResult | null = null;
  let confidenceLevel: 'high' | 'medium' | 'low' | 'very_low' = 'high';

  // Step 1: Multi-sample scoring (if enabled and we want to re-score)
  // Note: For performance, we typically use multi-sampling during initial scoring
  // Here we just analyze the initial score's confidence
  if (config.multiSample.enabled) {
    // For now, we derive confidence from ensemble agreement rather than re-scoring
    // This avoids additional API calls while still adjusting weights
    const scoreRange = Math.abs(ensembleConfidence - 50) * 2; // Convert 0-100 to variance proxy

    if (scoreRange < 30) {
      confidenceLevel = 'very_low';
      consistencyFlags.push('very_low_agreement');
    } else if (scoreRange < 50) {
      confidenceLevel = 'low';
      consistencyFlags.push('low_agreement');
    } else if (scoreRange < 70) {
      confidenceLevel = 'medium';
    }

    multiSampleResult = {
      samples: [{ score: initialScore, temperature: 0.35, responseText: '', processingTimeMs: 0 }],
      medianScore: initialScore,
      meanScore: initialScore,
      variance: 0,
      standardDeviation: 0,
      confidenceLevel,
      selectedScore: initialScore,
      selectionMethod: 'single',
    };
  }

  // Step 2: Cross-model validation for high-stakes scores
  if (config.crossValidation.enabled && currentScore >= config.crossValidation.highStakesThreshold) {
    crossValidationResult = await crossValidateScore(
      ai,
      prompt,
      currentScore,
      responseSchema,
      parseFunction,
      config.crossValidation
    );

    if (crossValidationResult.wasValidated) {
      if (!crossValidationResult.validationPassed) {
        consistencyFlags.push('cross_validation_divergence');
        currentScore = crossValidationResult.finalScore;
      } else {
        consistencyFlags.push('cross_validation_passed');
      }
    }
  }

  // Step 3: Adjust AI weight based on confidence
  const { adjustedWeight, reason: weightReason } = adjustAiWeightForConfidence(
    baseAiWeight,
    confidenceLevel,
    ensembleConfidence,
    config.confidenceAdjustment
  );

  if (weightReason) {
    consistencyFlags.push('ai_weight_adjusted');
  }

  return {
    originalScore: initialScore,
    adjustedScore: currentScore,
    multiSample: multiSampleResult,
    crossValidation: crossValidationResult,
    adjustedAiWeight: adjustedWeight,
    originalAiWeight: baseAiWeight,
    confidenceLevel,
    consistencyFlags,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract text from Gemini response (handles various response structures)
 */
function extractText(response: any): string | undefined {
  return response.text
    || response.candidates?.[0]?.content?.parts?.[0]?.text
    || response.candidates?.[0]?.text
    || response.response?.text;
}

/**
 * Format consistency result for feedback display
 */
export function formatConsistencyFeedback(result: ConsistencyResult): string {
  if (result.consistencyFlags.length === 0) {
    return '';
  }

  const parts: string[] = [];

  if (result.crossValidation?.wasValidated && !result.crossValidation.validationPassed) {
    parts.push(`
<div style="background:#1e1e2e;padding:8px;border-radius:6px;border-left:3px solid #f59e0b;margin:6px 0;font-size:0.85em;">
  <p style="margin:0;color:#f59e0b;">
    <strong>Score Verification Note:</strong> ${result.crossValidation.adjustmentReason}
  </p>
</div>`);
  }

  if (result.confidenceLevel === 'very_low' || result.confidenceLevel === 'low') {
    parts.push(`
<div style="background:#1e1e2e;padding:8px;border-radius:6px;border-left:3px solid #8b5cf6;margin:6px 0;font-size:0.85em;">
  <p style="margin:0;color:#8b5cf6;">
    <strong>Confidence Note:</strong> Score confidence is ${result.confidenceLevel.replace('_', ' ')}.
    Validation-based scoring was weighted more heavily.
  </p>
</div>`);
  }

  return parts.join('');
}

/**
 * Log consistency analytics for monitoring
 */
export function logConsistencyAnalytics(
  result: ConsistencyResult,
  gameId: string,
  playerId: string
): void {
  console.log(`[Consistency] Game=${gameId}, Player=${playerId}: ` +
    `original=${result.originalScore}, adjusted=${result.adjustedScore}, ` +
    `confidence=${result.confidenceLevel}, ` +
    `aiWeight=${result.originalAiWeight.toFixed(2)}->${result.adjustedAiWeight.toFixed(2)}, ` +
    `flags=[${result.consistencyFlags.join(',')}], ` +
    `time=${result.processingTimeMs}ms`);
}

export default {
  multiSampleScore,
  crossValidateScore,
  adjustAiWeightForConfidence,
  applyConsistencyChecks,
  formatConsistencyFeedback,
  logConsistencyAnalytics,
  DEFAULT_CONSISTENCY_CONFIG,
};
