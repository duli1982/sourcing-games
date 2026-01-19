import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { games } from './_lib/data/games.js';
import { Attempt, Player, ValidationResult, GameOverride } from '../types.js';
import { checkNewAchievements } from './_lib/data/achievements.js';
import { rubricByDifficulty } from '../utils/rubrics.js';
import { computeServerValidation } from './_lib/computeValidation.js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import {
  calculateEnhancedScore,
  generateScoringPrompt,
  parseAiResponseWithSchema,
  getCachedEmbedding,
  type EnhancedScoringResult,
} from './_lib/enhancedScoring.js';
import {
  calculateMultiReferenceScore,
  calculateMultiReferenceScoreWithCrossGame,
  formatCrossGameFeedback,
  type CrossGameReferenceResult,
  calculateMultiReferenceWeight,
  formatMultiReferenceFeedback,
  addReferenceAnswer,
  getReferenceStats,
  REFERENCE_CONFIG,
} from './_lib/referenceAnswers.js';
import {
  logScoringAnalytics,
  calculateGamingRiskLevel,
  countWords,
  type ScoringAnalyticsInput,
} from './_lib/scoringAnalytics.js';
import {
  buildFeedbackContext,
  generatePersonalizedFeedback,
} from './_lib/playerHistoryAnalysis.js';
import {
  analyzeClusterProgression,
  formatClusteringFeedback,
  updatePlayerClusterProgress,
  logCrossGameProgression,
} from './_lib/skillClustering.js';
import {
  retrieveKnowledgeForScoring,
  logKnowledgeRetrieval,
  type RetrievalResult,
} from './_lib/ragKnowledge.js';
import {
  updateDifficultyProfile,
  generateDifficultyFeedback,
  formatDifficultyFeedbackHtml,
  type DifficultyUpdateResult,
} from './_lib/adaptiveDifficulty.js';
import {
  applyCalibration,
  formatCalibrationFeedback,
  type CalibrationResult,
} from './_lib/scoreCalibration.js';
import {
  detectGaming,
  detectGamingWithContext,
  formatContextAdjustmentFeedback,
  getGameWritingContext,
  logGamingDetection,
  formatGamingFeedback,
  type GamingDetectionResult,
} from './_lib/antiGamingDetection.js';
import {
  recordFeedback,
  linkFollowupAttempt,
  createFeedbackRecordFromScoring,
  type FeedbackComponents,
} from './_lib/feedbackQuality.js';
import {
  updateSkillMemory,
  getSpacedRepetitionSummary,
  formatSpacedRepetitionFeedback,
  getPlayerSkillMemories,
} from './_lib/spacedRepetition.js';
import { buildCustomGameFromOverride } from './_lib/customGames.js';
import { buildReviewReasons, enqueueReview } from './_lib/reviewQueue.js';
import { logRubricCriteriaScores, type RubricBreakdown } from './_lib/rubricTuning.js';
import {
  applyConsistencyChecks,
  formatConsistencyFeedback,
  logConsistencyAnalytics,
  DEFAULT_CONSISTENCY_CONFIG,
  type ConsistencyResult,
} from './_lib/aiScoringConsistency.js';
import {
  validateRubricBreakdown,
  formatRubricValidationFeedback,
  calculateCorrectedScore,
  getRubricBreakdownSummary,
  type AiRubricBreakdown,
  type RubricValidationResult,
} from './_lib/rubricAggregation.js';
import {
  calculatePeerComparison,
  formatPeerComparisonFeedback,
  formatTopPercentageBadge,
  DEFAULT_PEER_CONFIG,
  type PeerComparisonResult,
} from './_lib/peerComparison.js';
import {
  calculateXpBonus,
  shouldEnableReviewMode,
  applyReviewMode,
  recordRetentionDataPoint,
  getRetentionStats,
  formatXpBonusFeedback,
  formatReviewModeFeedback,
  formatRetentionFeedback,
  REVIEW_MODE_CONFIG,
  type XpBonusResult,
  type ReviewModeResult,
  type RetentionStats,
} from './_lib/spacedRepetitionEnhancements.js';

const GEMINI_MAX_OUTPUT_TOKENS = 800; // Increased for structured JSON output
const GEMINI_PROMPT_CHAR_LIMIT = 4500; // Increased further for RAG context
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_SECOND_FALLBACK_MODEL = 'gemini-3-flash';
const HINT_PENALTY_POINTS = 3;
const MAX_HINTS = 3;
const promptCache = new Map<string, string>();
const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['score', 'dimensions', 'skillsRadar', 'rubricBreakdown', 'strengths', 'improvements', 'feedback'],
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    dimensions: {
      type: 'object',
      required: ['technicalAccuracy', 'creativity', 'completeness', 'clarity', 'bestPractices'],
      properties: {
        technicalAccuracy: { type: 'number', minimum: 0, maximum: 100 },
        creativity: { type: 'number', minimum: 0, maximum: 100 },
        completeness: { type: 'number', minimum: 0, maximum: 100 },
        clarity: { type: 'number', minimum: 0, maximum: 100 },
        bestPractices: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
    skillsRadar: {
      type: 'object',
      additionalProperties: { type: 'number', minimum: 0, maximum: 100 },
    },
    rubricBreakdown: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['points', 'maxPoints', 'reasoning'],
        properties: {
          points: { type: 'number', minimum: 0 },
          maxPoints: { type: 'number', minimum: 0 },
          reasoning: { type: 'string' },
        },
      },
    },
    strengths: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: { type: 'string' },
    },
    improvements: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: { type: 'string' },
    },
    feedback: { type: 'string' },
  },
};

// Enhanced scoring system v3.1 - adds spaced repetition XP bonus, review mode, retention tracking
const SCORING_VERSION = '3.1.0';

type PlayerRow = {
  id: string;
  name: string;
  score?: number | null;
  session_token?: string | null;
  status?: string | null;
  progress?: { attempts?: Attempt[]; achievements?: Player['achievements']; pinHash?: string | null };
};

type EmbeddingResponse = {
  embedding?: { values?: number[] };
};

type ChallengeRow = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  challenger_score: number | null;
  challenged_score: number | null;
};

type GenerateContentRequest = {
  model: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  config: {
    temperature: number;
    maxOutputTokens: number;
    candidateCount: number;
    responseMimeType: string;
    responseSchema: typeof GEMINI_RESPONSE_SCHEMA;
  };
};

type GeminiResponse = {
  text?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; text?: string }>;
  response?: { text?: string };
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient<any>(supabaseUrl, supabaseServiceRoleKey);
};

const mapPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  name: row.name,
  score: row.score ?? 0,
  sessionToken: row.session_token,
  attempts: row.progress?.attempts || [],
  achievements: row.progress?.achievements || [],
  pinHash: row.progress?.pinHash || undefined,
});

const extractGeminiText = (response: GeminiResponse | unknown): string | undefined => {
  const geminiResponse = response as GeminiResponse;
  return geminiResponse.text
    || geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text
    || geminiResponse.candidates?.[0]?.text
    || geminiResponse.response?.text;
};

const getEmbeddingValues = async (ai: GoogleGenAI, text: string): Promise<number[]> => {
  const response = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: { parts: [{ text }] },
  });
  const typed = response as EmbeddingResponse;
  const values = typed.embedding?.values;
  return Array.isArray(values) ? values : [];
};

const submitChallengeScoreIfNeeded = async (
  supabase: any,
  playerId: string,
  gameId: string,
  score: number
): Promise<void> => {
  const supabaseAny = supabase as any;
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'accepted')
      .gt('expires_at', nowIso)
      .or(`challenger_id.eq.${playerId},challenged_id.eq.${playerId}`)
      .order('accepted_at', { ascending: false })
      .limit(5);

    if (error) {
      console.warn('Challenge lookup failed:', error);
      return;
    }

    const challenges = (data as ChallengeRow[] | null) || [];
    const pending = challenges.find(c => (
      (c.challenger_id === playerId && c.challenger_score === null) ||
      (c.challenged_id === playerId && c.challenged_score === null)
    ));

    if (!pending) return;

    const updateData: Partial<ChallengeRow> = pending.challenger_id === playerId
      ? { challenger_score: score }
      : { challenged_score: score };

    const { error: updateError } = await supabaseAny
      .from('challenges')
      .update(updateData)
      .eq('id', pending.id);

    if (updateError) {
      console.warn('Challenge score update failed:', updateError);
      return;
    }

    console.log(`Challenge score submitted: challenge=${pending.id}, player=${playerId}, score=${score}`);
  } catch (err) {
    console.warn('Challenge score submission failed:', err);
  }
};

/**
 * Ensures the feedback string is HTML. If the model returns plain text/markdown,
 * we escape it and wrap it so the UI renders safely.
 */
const normalizeFeedbackHtml = (feedback: string): string => {
  const trimmed = feedback.trim();
  if (!trimmed) {
    throw new Error('Feedback is empty');
  }

  const looksLikeHtml = /<[^>]+>/.test(trimmed);
  if (looksLikeHtml) {
    return trimmed;
  }

  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const paragraphs = escaped
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => p.replace(/\n/g, '<br/>'));

  return paragraphs.length
    ? `<p>${paragraphs.join('</p><p>')}</p>`
    : `<p>${escaped}</p>`;
};

/**
 * Extracts the JSON payload from the model response and validates it with Zod.
 * Throws on any schema violation to avoid silently accepting malformed output.
 */
const parseAiResponseStrict = (rawText: string): { score: number; feedback: string; rubricBreakdown: AiRubricBreakdown } => {
  const parsed = parseAiResponseWithSchema(rawText);
  if (!parsed.success) {
    const error = (parsed as { success: false; error: string }).error;
    throw new Error(error);
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(parsed.data.score)));
  const normalizedFeedback = normalizeFeedbackHtml(parsed.data.feedback);
  return { score: normalizedScore, feedback: normalizedFeedback, rubricBreakdown: parsed.data.rubricBreakdown || {} };
};

/**
 * Enhances feedback for high-scoring submissions (85%+)
 * Adds celebration message
 */
const enhanceFeedbackForHighScores = (feedback: string, score: number, gameTitle: string): string => {
  if (score >= 85) {
    const celebration = `
<hr/>
<p><strong>OUTSTANDING WORK!</strong></p>
<p>You've achieved an expert-level score (${score}/100) on ${gameTitle}. This is professional-grade sourcing that shows you really know your stuff.</p>
<p>Keep crushing it!</p>`;

    return feedback + celebration;
  }

  return feedback;
};

const computePeerStats = (scores: number[], currentScore: number) => {
  if (scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = sorted.findIndex(s => s > currentScore);
  const rankIndex = idx === -1 ? sorted.length - 1 : idx;
  const percentile = Math.round(((rankIndex + 1) / sorted.length) * 100);
  const p15 = sorted[Math.max(0, Math.floor(0.15 * (sorted.length - 1)))];
  const p85 = sorted[Math.min(sorted.length - 1, Math.ceil(0.85 * (sorted.length - 1)))];
  return { percentile, p15, p85, count: sorted.length };
};

const PEER_STOPWORDS = new Set([
  'and', 'or', 'not', 'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'with', 'by', 'at', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'as', 'that', 'this', 'these', 'those', 'it',
  'your', 'you', 'we', 'our', 'their', 'they', 'them', 'us', 'i', 'me', 'my', 'mine', 'yours',
  'site', 'intitle', 'inurl', 'filetype', 'linkedin', 'github', 'stackoverflow'
]);

const extractPeerTokens = (text: string): Set<string> => {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = new Set<string>();
  for (const word of normalized.split(' ')) {
    if (word.length < 3) continue;
    if (PEER_STOPWORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    tokens.add(word);
  }
  return tokens;
};

const buildPeerComparisonInsights = (
  submissionText: string,
  references: Array<{ submission: string }>
): string => {
  if (!references || references.length < 3) return '';

  const submissionTokens = extractPeerTokens(submissionText);
  const termCounts = new Map<string, number>();

  for (const ref of references) {
    const refTokens = extractPeerTokens(ref.submission || '');
    for (const token of refTokens) {
      termCounts.set(token, (termCounts.get(token) || 0) + 1);
    }
  }

  const threshold = Math.max(2, Math.ceil(references.length * 0.5));
  const commonTerms = Array.from(termCounts.entries())
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .slice(0, 8);

  if (commonTerms.length === 0) return '';

  const missing = commonTerms.filter(term => !submissionTokens.has(term)).slice(0, 6);
  if (missing.length === 0) return '';

  return `
<div style="background:#0f172a;padding:10px;border-radius:8px;border:1px solid #38bdf8;margin-bottom:10px;">
  <p><strong>Top scorer patterns</strong></p>
  <p>High performers often include: <strong>${commonTerms.slice(0, 6).join(', ')}</strong></p>
  <p>Consider adding: <strong>${missing.join(', ')}</strong></p>
</div>`;
};

const formatSpacedRepetitionRecommendations = (
  recommendations: Array<{ gameTitle: string; recommendationReason: string }>
): string => {
  if (!recommendations.length) return '';
  const items = recommendations
    .slice(0, 3)
    .map(r => `<li><strong>${r.gameTitle}</strong>: ${r.recommendationReason}</li>`)
    .join('');
  return `
<div style="background:#0f172a;padding:12px;border-radius:8px;border:1px solid #2563eb;margin:10px 0;">
  <p><strong>Spaced Repetition Recommendations</strong></p>
  <ul>${items}</ul>
</div>`;
};

/**
 * Calculate cosine similarity between two text embeddings
 * Returns similarity score between 0 and 1
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

/**
 * Calculate semantic similarity between submission and example solution
 * using Gemini embeddings API
 */
const calculateEmbeddingSimilarity = async (
  ai: GoogleGenAI,
  submission: string,
  exampleSolution: string
): Promise<number> => {
  try {
    // Generate embeddings for both texts
    const [submissionVec, exampleVec] = await Promise.all([
      getEmbeddingValues(ai, submission),
      getEmbeddingValues(ai, exampleSolution)
    ]);

    if (submissionVec.length === 0 || exampleVec.length === 0) {
      console.warn('Empty embedding vectors returned');
      return 0;
    }

    return cosineSimilarity(submissionVec, exampleVec);
  } catch (error) {
    console.error('Embedding similarity calculation failed:', error);
    return 0; // Graceful fallback
  }
};

const sendError = (
  res: VercelResponse,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) => res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'method_not_allowed', 'Only POST is supported for submissions.');
  }

  // Track processing time for analytics
  const processingStartTime = Date.now();

  try {
    // Security: Read session token from httpOnly cookie instead of request body
    const sessionToken = getSessionTokenFromCookie(req);

    const { gameId, submission, validation: clientValidation, skillLevel, hintLevel } = (req.body ?? {}) as {
      gameId?: string;
      submission?: string;
      validation?: ValidationResult | null;
      skillLevel?: 'beginner' | 'intermediate' | 'expert';
      hintLevel?: number;
    };

    if (!sessionToken || typeof sessionToken !== 'string') {
      return sendError(res, 401, 'missing_session_token', 'Please log in again to submit attempts.');
    }
    if (!gameId || typeof gameId !== 'string') {
      return sendError(res, 400, 'missing_game_id', 'We could not identify which game you are playing.');
    }
    if (!submission || typeof submission !== 'string' || !submission.trim()) {
      return sendError(res, 400, 'missing_submission', 'Submission text is required to score your attempt.');
    }
    const MAX_SUBMISSION_LENGTH = 10000; // guardrail against oversized payloads
    if (submission.length > MAX_SUBMISSION_LENGTH) {
      return sendError(
        res,
        400,
        'submission_too_long',
        `Submission must be under ${MAX_SUBMISSION_LENGTH} characters.`
      );
    }
    const normalizedHintLevel = Number.isFinite(Number(hintLevel))
      ? Math.max(0, Math.min(MAX_HINTS, Math.floor(Number(hintLevel))))
      : 0;
    const hintPenalty = normalizedHintLevel * HINT_PENALTY_POINTS;

    // Initialize Supabase client once for all database operations
    const supabase = getSupabase();

    // Apply game override if exists
    let override: GameOverride | null = null;
    try {
      const { data: overrideRow } = await supabase
        .from('game_overrides')
        .select('*')
        .eq('id', gameId)
        .maybeSingle();
      override = overrideRow;
    } catch (err) {
      console.warn('Failed to fetch game override', err);
    }

    let game = games.find(g => g.id === gameId);
    if (!game && override) {
      const customGame = buildCustomGameFromOverride(override);
      if (customGame) {
        game = customGame;
      }
    }
    if (!game) {
      return sendError(res, 404, 'game_not_found', 'That game is unavailable. Please refresh and try again.');
    }

    if (override && override.active === false) {
      return sendError(res, 404, 'game_inactive', 'This game is currently inactive.');
    }

    // Server-side validation (do not trust client-provided validation for scoring fairness).
    // We still accept client validation in the payload for debugging/back-compat, but we don't use it for scoring.
    const validation = computeServerValidation(game, submission);

    // Fetch player data
    const { data: playerRow, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (playerError || !playerRow) {
      return sendError(res, 401, 'invalid_session', 'Your session expired. Please re-open the app to continue playing.');
    }
    if (playerRow.status === 'banned') {
      return sendError(res, 403, 'player_banned', 'Your account is banned. Contact an admin for help.');
    }

    // Check if player already submitted for this game (1 attempt per game limit)
    const attempts = playerRow.progress?.attempts || [];
    const existingAttempt = attempts.find(a => a.gameId === gameId);
    if (existingAttempt) {
      return sendError(
        res,
        409,
        'already_submitted',
        'You have already submitted for this game. Only one submission per game is allowed in Challenge mode.'
      );
    }

    // Rate Limiting: Check last attempt timestamp
    if (attempts.length > 0) {
      const lastAttempt = attempts[attempts.length - 1];
      const lastAttemptTime = new Date(lastAttempt.ts).getTime();
      if (Number.isNaN(lastAttemptTime)) {
        console.error('Invalid timestamp in last attempt:', lastAttempt?.ts);
        return sendError(res, 429, 'cooldown_active', 'Please wait 30 seconds before submitting again.');
      }
      const now = Date.now();
      const cooldownMs = 30000; // 30 seconds

      if (now - lastAttemptTime < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastAttemptTime)) / 1000);
        return sendError(
          res,
          429,
          'cooldown_active',
          `Please wait ${remainingSeconds} seconds before submitting again.`
        );
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendError(res, 500, 'missing_gemini_key', 'AI feedback is temporarily unavailable. Please try again later.');
    }

    const userSkillLevel: 'beginner' | 'intermediate' | 'expert' = skillLevel ?? 'intermediate';

    const ai = new GoogleGenAI({ apiKey });

    // Append strict JSON instruction to override any game-specific formatting
    const systemInstruction = `
*** CRITICAL INSTRUCTION ***
You are an encouraging but critical AI coach for sourcing professionals.
The player's self-calculated skill level is "${userSkillLevel}".

Adjust detail and tone based on skill:
- Beginner: explain basics, show short templates or examples.
- Intermediate: push for optimization and alternatives.
- Expert: critique edge cases, suggest advanced techniques/efficiency gains.

Your feedback must:
1. Start with 1-2 specific things the user did well (even if score is low)
2. Evaluate EACH rubric criterion explicitly - show how the submission performs on each criterion
3. Explain the "why" behind each issue, not just identify it
4. Provide concrete examples showing wrong vs. right approaches
5. End with 2-3 specific, actionable next steps
6. Use an encouraging but honest tone - celebrate wins, be direct about gaps

IMPORTANT SCORING INSTRUCTIONS:
- Consider the automated validation score as a baseline
- Evaluate each rubric criterion individually and show your reasoning
- Your final score should be fair and balanced, reflecting both strengths and weaknesses
- If the submission has fundamental issues (missing requirements, off-topic), score accordingly low
- If the submission is excellent and addresses all criteria, score accordingly high

Required JSON Structure:
{
  "score": number, // Integer between 0 and 100
  "dimensions": {
    "technicalAccuracy": number,
    "creativity": number,
    "completeness": number,
    "clarity": number,
    "bestPractices": number
  },
  "skillsRadar": {
    "${game.skillCategory}": number
  },
  "rubricBreakdown": {
    "<criterion>": {
      "points": number,
      "maxPoints": number,
      "reasoning": "string"
    }
  },
  "strengths": ["string"],
  "improvements": ["string"],
  "feedback": "string" // HTML format with <strong>, <ul>, <li>, <p>. Structure:
                        // 1. What worked well (even if only 1-2 things)
                        // 2. Rubric evaluation (how you scored each criterion)
                        // 3. What needs improvement (specific issues)
                        // 4. Why it matters (context/impact)
                        // 5. How to improve (concrete examples)
                        // 6. Next steps (2-3 actionable items)
}

Example Response:
{
  "score": 65,
  "dimensions": {
    "technicalAccuracy": 60,
    "creativity": 55,
    "completeness": 70,
    "clarity": 75,
    "bestPractices": 50
  },
  "skillsRadar": {
    "${game.skillCategory}": 64
  },
  "rubricBreakdown": {
    "Completeness": { "points": 20, "maxPoints": 30, "reasoning": "Covers main skills but missing location and seniority." },
    "Technical accuracy": { "points": 15, "maxPoints": 25, "reasoning": "Boolean syntax is correct but lacks grouping." },
    "Clarity": { "points": 20, "maxPoints": 25, "reasoning": "Clear intent, easy to understand." },
    "Best practices": { "points": 10, "maxPoints": 20, "reasoning": "Missing proximity operators and advanced techniques." }
  },
  "strengths": [
    "Included key skills (React, Node.js)",
    "Used AND/OR operators"
  ],
  "improvements": [
    "Add parentheses around OR groups",
    "Include location targeting (Vienna/Wien)"
  ],
  "feedback": "<p><strong>What worked well:</strong></p><ul><li>You included key skills (React, Node.js)</li><li>You used AND/OR operators</li></ul><p><strong>Rubric evaluation:</strong></p><ul><li>Completeness (20/30 pts): Covers main skills but missing location and seniority level</li><li>Technical accuracy (15/25 pts): Boolean syntax correct but lacks parentheses for grouping</li><li>Clarity (20/25 pts): Clear intent, easy to understand</li><li>Best practices (10/20 pts): Missing proximity operators and advanced techniques</li></ul><p><strong>What needs improvement:</strong></p><ul><li>Missing parentheses around OR groups - this can return unintended results</li><li>No location targeting - you'll get global results instead of Vienna-specific</li></ul><p><strong>Why this matters:</strong> Without parentheses, 'React OR Vue AND developer' searches for (React) OR (Vue AND developer), not (React OR Vue) AND (developer).</p><p><strong>How to fix:</strong><br/>Example: React OR Vue AND developer<br/>Fixed: (React OR Vue) AND developer</p><p><strong>Next steps:</strong></p><ul><li>Add parentheses around all OR groups</li><li>Include location: (Vienna OR Wien)</li><li>Test your search and refine</li></ul>"
}

Respond with valid JSON only. Do not include text outside the JSON object or any markdown fences.`;

    const promptBase =
      override?.prompt_template ||
      game.promptGenerator(submission, rubricByDifficulty[game.difficulty], validation);

    const skillContext = `
## PLAYER SKILL CONTEXT
- Skill level: ${userSkillLevel}
- Tailor depth: beginners need fundamentals and templates; intermediates need optimization ideas; experts need edge-case critiques and advanced tactics.
`;

    // Append validation context if available
    let validationContext = '';
    if (validation) {
      validationContext = `
## AUTOMATED VALIDATION RESULTS
The system ran some basic checks on this submission:
- Automated Score: ${validation.score}/100
- Automated Feedback: ${validation.feedback.length > 0 ? validation.feedback.join('; ') : 'No issues found.'}
- Checks Passed: ${JSON.stringify(validation.checks)}
- Strengths: ${Array.isArray(validation.strengths) && validation.strengths.length > 0 ? validation.strengths.join('; ') : 'No automated strengths captured.'}

Please take these automated checks into account. If the automated score is low, your final score should reflect that.
`;
    }

    // Append generic rubric context
    const genericRubric = rubricByDifficulty[game.difficulty];
    const rubricContext = `
## GENERAL SCORING GUIDELINES (${game.difficulty.toUpperCase()} DIFFICULTY)
In addition to the specific game requirements, evaluate based on these general criteria:
${genericRubric.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n')}
`;

    // ========================================================================
    // RAG KNOWLEDGE RETRIEVAL v1.0 - Domain-expert knowledge for scoring
    // Retrieves relevant sourcing best practices to inform AI evaluation
    // ========================================================================

    let ragContext = '';
    let ragRetrievalResult: RetrievalResult | null = null;

    try {
      // Get the submission embedding if we have it (computed later for multi-ref)
      // For now, do a quick embedding just for RAG
      const ragEmbedding = await getEmbeddingValues(ai, `${game.task}\n${submission}`);

      if (ragEmbedding.length > 0) {
        ragRetrievalResult = await retrieveKnowledgeForScoring(
          supabase,
          submission,
          { id: game.id, skillCategory: game.skillCategory, task: game.task },
          ragEmbedding,
          { skillLevel: userSkillLevel }
        );

        if (ragRetrievalResult.context && ragRetrievalResult.articles.length > 0) {
          ragContext = `
## SOURCING DOMAIN KNOWLEDGE
Use this expert knowledge to inform your evaluation:
${ragRetrievalResult.context}
`;
          console.log(`[RAG] Retrieved ${ragRetrievalResult.articles.length} articles for ${game.id} ` +
            `(avg similarity: ${(ragRetrievalResult.avgSimilarity * 100).toFixed(1)}%, ` +
            `time: ${ragRetrievalResult.retrievalTimeMs}ms)`);
        }
      }
    } catch (ragError) {
      console.warn('[RAG] Knowledge retrieval failed:', ragError);
      // Continue without RAG context - non-critical feature
    }

    const maxPromptLength = GEMINI_PROMPT_CHAR_LIMIT + 500;
    const promptHead = `${promptBase}${skillContext}${validationContext}${rubricContext}${ragContext}`;
    let prompt = `${promptHead}\n\n${systemInstruction}`;

    if (prompt.length > maxPromptLength) {
      console.warn(`Prompt too long (${prompt.length} chars), truncating non-critical context.`);
      const availableForHead = Math.max(0, maxPromptLength - systemInstruction.length - 2); // account for \n\n
      const trimmedHead = promptHead.slice(0, availableForHead);
      prompt = `${trimmedHead}\n\n${systemInstruction}`;
    }

    const trimmedPrompt = prompt.slice(0, maxPromptLength); // final safety slice

    // Use the Gemini SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using 2.5-flash (stable and reliable)
      contents: [{ role: 'user', parts: [{ text: trimmedPrompt }] }],
      config: {
        temperature: 0.35,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        candidateCount: 1,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    } as GenerateContentRequest);

    console.log('Gemini full response:', JSON.stringify(response, null, 2));

    // Extract text - using type assertion to handle dynamic Gemini SDK response structure
    let responseText = extractGeminiText(response);

    if (!responseText) {
      console.error('Gemini response structure:', JSON.stringify(response, null, 2));
      return sendError(res, 500, 'empty_model_response', 'AI feedback is temporarily unavailable. Please try again.');
    }

    // Strict JSON parsing with schema validation
    let score: number;
    let feedbackText: string;
    let aiRubricBreakdown: AiRubricBreakdown | null = null;
    let usedAutomatedOnly = false;

    try {
      const parsed = parseAiResponseStrict(responseText);
      score = parsed.score;
      feedbackText = parsed.feedback;
      aiRubricBreakdown = parsed.rubricBreakdown || null;
      promptCache.set(game.id, trimmedPrompt);
    } catch (parseError: unknown) {
      const message = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('Failed to parse AI response:', message);
      console.error('Raw AI response text:', responseText);

      const fallbackPrompt = promptCache.get(game.id) || `
You are an AI coach. Skill level: ${userSkillLevel}.
Submission: """${submission}"""
Automated score: ${validation?.score ?? 'n/a'}
Automated feedback: ${Array.isArray(validation?.feedback) ? validation?.feedback.join('; ') : 'n/a'}

Return JSON only using this structure:
{
  "score": <0-100 integer>,
  "dimensions": { "technicalAccuracy": <number>, "creativity": <number>, "completeness": <number>, "clarity": <number>, "bestPractices": <number> },
  "skillsRadar": { "${game.skillCategory}": <number> },
  "rubricBreakdown": { "<criterion>": { "points": <number>, "maxPoints": <number>, "reasoning": "<brief explanation>" } },
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"],
  "feedback": "<HTML feedback>"
}
Keep feedback concise, structured, and in HTML (no markdown fences).
`;
      try {
        const retryResponse = await ai.models.generateContent({
          model: GEMINI_FALLBACK_MODEL,
          contents: [{ role: 'user', parts: [{ text: fallbackPrompt }] }],
          config: {
            temperature: 0.2,
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
            candidateCount: 1,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        } as GenerateContentRequest);
        const retryText = extractGeminiText(retryResponse);

        if (!retryText) {
          throw new Error('Empty retry response');
        }

        const parsedRetry = parseAiResponseStrict(retryText);
        score = parsedRetry.score;
        feedbackText = parsedRetry.feedback;
        aiRubricBreakdown = parsedRetry.rubricBreakdown || null;
        promptCache.set(game.id, fallbackPrompt);
      } catch (retryError) {
        console.error('Simplified retry failed:', retryError);

        try {
          const secondRetryResponse = await ai.models.generateContent({
            model: GEMINI_SECOND_FALLBACK_MODEL,
            contents: [{ role: 'user', parts: [{ text: fallbackPrompt }] }],
            config: {
              temperature: 0.2,
              maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
              candidateCount: 1,
              responseMimeType: 'application/json',
              responseSchema: GEMINI_RESPONSE_SCHEMA,
            },
          } as GenerateContentRequest);
          const secondRetryText = extractGeminiText(secondRetryResponse);

          if (!secondRetryText) {
            throw new Error('Empty second retry response');
          }

          const parsedSecondRetry = parseAiResponseStrict(secondRetryText);
          score = parsedSecondRetry.score;
          feedbackText = parsedSecondRetry.feedback;
          aiRubricBreakdown = parsedSecondRetry.rubricBreakdown || null;
          promptCache.set(game.id, fallbackPrompt);
        } catch (secondRetryError) {
          console.error('Second retry failed:', secondRetryError);

          // Fallback to automated validation if available
          if (validation) {
            console.warn('Using fallback validation score due to AI parsing error');
            usedAutomatedOnly = true;
            score = validation.score;

            const issues = validation.feedback.length > 0 ? validation.feedback : ['No automated issues found.'];
            const issuesList = issues.map((f: string) => `<li>${normalizeFeedbackHtml(f)}</li>`).join('');

            // Keep validation checks available, but hide them by default (they're mostly useful for debugging).
            let checksList = '';
            if (validation.checks && typeof validation.checks === 'object') {
              const entries = Object.entries(validation.checks);
              if (entries.length > 0) {
                const passed = entries.filter(([, v]) => Boolean(v)).length;
                const total = entries.length;
                const items = entries
                  .map(([k, v]) => `<li><code>${normalizeFeedbackHtml(k)}</code>: ${v ? 'Passed' : 'Failed'}</li>`)
                  .join('');
                checksList = `
<details style="margin-top:10px;">
  <summary style="cursor:pointer;color:#93c5fd;">Technical checks (${passed}/${total} passed)</summary>
  <ul style="margin-top:6px;">${items}</ul>
</details>`;
              }
            }

            // Automated strengths are NOT displayed (AI-only for positive feedback)
            // Strengths are still collected in validation data and passed to AI for context

            const actionSteps = [
              'Address the items above (e.g., 2+ sentences covering risk and value).',
              'Review the game requirements and example solution.',
              'Resubmit when ready; full AI feedback will return on your next attempt.'
            ];
            if (validation.score < 50) {
              actionSteps.push('Scores below 50 usually miss core requirements - ensure you cover every required element.');
            }
            const actionList = actionSteps.map(step => `<li>${normalizeFeedbackHtml(step)}</li>`).join('');

            feedbackText = `
<div style="background:#0f172a;padding:12px;border-radius:8px;border:1px solid #1d4ed8;margin-bottom:8px;">
  <p><strong>Automated evaluation (AI coach unavailable)</strong></p>
  <p><strong>Score:</strong> ${validation.score}/100 (automated)</p>
  <p style="margin-top:6px;"><strong>Issues detected:</strong></p>
  <ul>${issuesList}</ul>
  ${checksList}
  <div style="margin-top:8px;">
    <p><strong>What to do next:</strong></p>
    <ul>${actionList}</ul>
  </div>
  <p style="margin-top:8px;color:#93c5fd;">Full AI feedback will return on your next submission.</p>
</div>`;
          } else {
            return sendError(res, 500, 'invalid_model_json', 'AI feedback was not returned in the expected format. Please try again.');
          }
        }
      }
    }

    // ========================================================================
    // RUBRIC AGGREGATION VALIDATION v3.0
    // Validates AI rubric scoring against game rubric definition
    // ========================================================================

    let rubricValidationResult: RubricValidationResult | null = null;
    let rubricValidationFeedback = '';

    if (aiRubricBreakdown && Object.keys(aiRubricBreakdown).length > 0 && !usedAutomatedOnly) {
      try {
        const gameRubric = game.rubric || rubricByDifficulty[game.difficulty];

        // Validate AI rubric breakdown against game rubric
        rubricValidationResult = validateRubricBreakdown(
          aiRubricBreakdown,
          gameRubric,
          score,
          {
            allowFuzzyMatch: true,
            maxScoreDivergence: 8, // Allow up to 8 points difference
            autoCorrectExceedingPoints: true,
            autoCorrectScoreMismatch: false, // Only warn, don't auto-correct
            fuzzyMatchThreshold: 0.65,
          }
        );

        // Log validation results
        const { aggregation, issues, warnings } = rubricValidationResult;
        console.log(`Rubric validation for ${game.id}: ` +
          `sum=${aggregation.totalPointsAwarded}/${aggregation.totalMaxPoints} (${aggregation.percentageScore}%), ` +
          `aiScore=${score}, ` +
          `matched=${aggregation.matchedCriteria}/${aggregation.criteriaCount}, ` +
          `issues=${issues.length}, warnings=${warnings.length}`);

        // Log detailed issues if any
        if (issues.length > 0) {
          console.log(`Rubric issues for ${game.id}:`, issues.map(i => i.message));
        }

        // Check if score should be corrected based on rubric
        const correctionResult = calculateCorrectedScore(score, rubricValidationResult, {
          rubricWeight: 0.25, // Blend 25% rubric score with 75% AI score
          divergenceThreshold: 12, // Only correct if divergence > 12 points
        });

        if (correctionResult.wasAdjusted) {
          console.log(`Rubric score correction for ${game.id}: ` +
            `${score} -> ${correctionResult.score} (adjustment: ${correctionResult.adjustment > 0 ? '+' : ''}${correctionResult.adjustment})`);
          score = correctionResult.score;
        }

        // Generate rubric validation feedback (shown in collapsible details)
        rubricValidationFeedback = formatRubricValidationFeedback(rubricValidationResult, true);

        // Get rubric breakdown summary for analytics
        if (rubricValidationResult.correctedBreakdown) {
          const summary = getRubricBreakdownSummary(rubricValidationResult.correctedBreakdown);
          if (summary.lowestCriterion) {
            console.log(`Rubric breakdown for ${game.id}: ` +
              `lowest="${summary.lowestCriterion}", ` +
              `highest="${summary.highestCriterion}", ` +
              `avg=${summary.averagePercentage}%`);
          }
        }
      } catch (rubricValidationError) {
        console.warn('Rubric validation failed:', rubricValidationError);
        // Continue without rubric validation - non-critical feature
      }
    }

    // ========================================================================
    // ENHANCED SCORING v2.1 - Ensemble + Multi-Reference scoring
    // ========================================================================

    // Calculate embedding similarity (now part of the score, not just informational)
    let embeddingSimilarity = 0;
    let submissionEmbedding: number[] = [];

    if (game.exampleSolution && game.exampleSolution.trim().length > 0) {
      try {
        // Get the submission embedding (we'll reuse this for multi-reference)
        submissionEmbedding = await getEmbeddingValues(ai, submission);

        if (submissionEmbedding.length > 0) {
          // Get example solution embedding
          const exampleEmbedding = await getEmbeddingValues(ai, game.exampleSolution);

          if (exampleEmbedding.length > 0) {
            // Calculate cosine similarity
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < submissionEmbedding.length; i++) {
              dot += submissionEmbedding[i] * exampleEmbedding[i];
              normA += submissionEmbedding[i] * submissionEmbedding[i];
              normB += exampleEmbedding[i] * exampleEmbedding[i];
            }
            const mag = Math.sqrt(normA) * Math.sqrt(normB);
            embeddingSimilarity = mag > 0 ? dot / mag : 0;
          }
        }
        console.log(`Embedding similarity for ${game.id}: ${(embeddingSimilarity * 100).toFixed(1)}%`);
      } catch (embeddingError) {
        console.warn('Embedding similarity calculation failed:', embeddingError);
        // Continue with 0 similarity - ensemble will adjust weights
      }
    }

    // ========================================================================
    // MULTI-REFERENCE SCORING - Compare against multiple high-scoring answers
    // ========================================================================

    let multiRefFeedback = '';
    let multiRefScoreAdjustment = 0;
    let multiRefReferencesCompared = 0;
    let multiRefVerifiedCount = 0;
    let multiRefBestSimilarity: number | undefined;
    let crossGameInfo: CrossGameReferenceResult | null = null;

    if (submissionEmbedding.length > 0) {
      try {
        // Get reference stats and multi-reference score WITH cross-game fallback
        const [refStats, multiRefResult] = await Promise.all([
          getReferenceStats(supabase, game.id),
          calculateMultiReferenceScoreWithCrossGame(
            supabase,
            game.id,
            game.skillCategory,
            submissionEmbedding,
            game.difficulty
          ),
        ]);

        // Store cross-game info for logging and feedback
        crossGameInfo = multiRefResult.crossGameInfo;

        if (multiRefResult.references.length > 0) {
          // Track reference data for analytics
          multiRefReferencesCompared = multiRefResult.references.length;
          multiRefVerifiedCount = multiRefResult.references.filter(r => r.isVerified).length;
          multiRefBestSimilarity = multiRefResult.bestMatchSimilarity;

          // Calculate weight for multi-reference scoring
          // Reduce weight if using cross-game references
          let multiRefWeight = calculateMultiReferenceWeight(refStats);
          if (crossGameInfo?.usedCrossGameFallback) {
            // Apply weight reduction for cross-game references
            multiRefWeight *= 0.7;
          }

          if (multiRefWeight > 0) {
            // Adjust score based on multi-reference analysis
            // If similar to high scorers, boost score; if dissimilar, reduce slightly
            const avgRefScore = multiRefResult.references.reduce((sum, r) => sum + r.score, 0) / multiRefResult.references.length;
            const similarityBonus = (multiRefResult.averageSimilarity - 0.5) * 20; // -10 to +10 range

            multiRefScoreAdjustment = Math.round(similarityBonus * multiRefWeight * 10);
            multiRefFeedback = formatMultiReferenceFeedback(multiRefResult, refStats);

            // Add cross-game feedback if applicable
            if (crossGameInfo?.usedCrossGameFallback) {
              multiRefFeedback = formatCrossGameFeedback(crossGameInfo, multiRefResult.averageSimilarity) + multiRefFeedback;
            }

            const peerInsightHtml = buildPeerComparisonInsights(submission, multiRefResult.references);
            if (peerInsightHtml) {
              multiRefFeedback += peerInsightHtml;
            }

            // Enhanced logging with cross-game info
            const crossGameLog = crossGameInfo?.usedCrossGameFallback
              ? `CROSS-GAME: ${crossGameInfo.totalFromCurrentGame}+${crossGameInfo.totalFromCrossGame} refs from ${crossGameInfo.sourceGames.length} games, `
              : '';

            console.log(`Multi-reference scoring for ${game.id}: ` +
              `${crossGameLog}` +
              `${multiRefResult.references.length} total refs, ` +
              `avgSim=${(multiRefResult.averageSimilarity * 100).toFixed(1)}%, ` +
              `weight=${(multiRefWeight * 100).toFixed(1)}%, ` +
              `adjustment=${multiRefScoreAdjustment > 0 ? '+' : ''}${multiRefScoreAdjustment}`);
          }
        } else {
          console.log(`No reference answers found for ${game.id} (including cross-game fallback)`);
        }
      } catch (multiRefError) {
        console.warn('Multi-reference scoring failed:', multiRefError);
        // Continue without multi-reference adjustment
      }
    }

    // Use enhanced scoring system - combines AI, validation, and embeddings
    let enhancedResult: EnhancedScoringResult;

    // Gaming detection variables (declared outside if block for logging)
    let gamingDetectionResult: GamingDetectionResult | null = null;
    let gamingPenalty = 0;
    let scoreBeforeGamingPenalty = 0;

    // AI Scoring Consistency variables
    let consistencyResult: ConsistencyResult | null = null;

    if (!usedAutomatedOnly && validation) {
      // ========================================================================
      // AI SCORING CONSISTENCY v1.0
      // Cross-model validation for high-stakes scores & confidence-adjusted weighting
      // ========================================================================

      try {
        // Apply consistency checks (cross-validation for high scores, confidence adjustment)
        consistencyResult = await applyConsistencyChecks(
          ai,
          trimmedPrompt,
          score, // Initial AI score
          feedbackText,
          GEMINI_RESPONSE_SCHEMA,
          (text: string) => {
            const parsed = parseAiResponseStrict(text);
            return { score: parsed.score, feedback: parsed.feedback };
          },
          validation.score > 0 ? Math.round((1 - Math.abs(score - validation.score) / 100) * 100) : 50, // Ensemble confidence proxy
          0.55, // Base AI weight
          DEFAULT_CONSISTENCY_CONFIG
        );

        // Log consistency analytics
        logConsistencyAnalytics(consistencyResult, game.id, playerRow.id);

        // If cross-validation adjusted the score, use the adjusted score
        if (consistencyResult.crossValidation?.wasValidated && !consistencyResult.crossValidation.validationPassed) {
          console.log(`Consistency adjustment for ${game.id}: ` +
            `${score} -> ${consistencyResult.adjustedScore} ` +
            `(${consistencyResult.crossValidation.adjustmentReason})`);
          score = consistencyResult.adjustedScore;
        }
      } catch (consistencyError) {
        console.warn('AI scoring consistency check failed:', consistencyError);
        // Continue without consistency adjustments
      }

      enhancedResult = calculateEnhancedScore({
        submission,
        game,
        rubric: rubricByDifficulty[game.difficulty],
        validation,
        aiScore: score,
        aiFeedback: feedbackText,
        embeddingSimilarity,
        playerSkillLevel: userSkillLevel,
        // Pass consistency parameters if available
        consistencyParams: consistencyResult ? {
          adjustedAiWeight: consistencyResult.adjustedAiWeight,
          confidenceLevel: consistencyResult.confidenceLevel,
          consistencyFlags: consistencyResult.consistencyFlags,
          consistencyFeedback: formatConsistencyFeedback(consistencyResult),
        } : undefined,
      });

      // Use enhanced score and feedback
      score = enhancedResult.finalScore;

      // Apply multi-reference adjustment
      if (multiRefScoreAdjustment !== 0) {
        score = Math.max(0, Math.min(100, score + multiRefScoreAdjustment));
      }

      // Apply score calibration to normalize difficulty across games
      let calibrationResult: CalibrationResult | null = null;
      let calibrationAdjustment = 0;
      try {
        calibrationResult = await applyCalibration(supabase, game.id, score, game.difficulty);
        if (calibrationResult.adjustmentApplied !== 0) {
          calibrationAdjustment = calibrationResult.adjustmentApplied;
          score = calibrationResult.calibratedScore;
          console.log(`Calibration applied for ${game.id}: ${calibrationResult.rawScore} -> ${score} (${calibrationAdjustment > 0 ? '+' : ''}${calibrationAdjustment})`);
        }
      } catch (calibrationError) {
        console.warn('Score calibration failed:', calibrationError);
        // Continue without calibration
      }

      // Combine feedback: multi-reference + ensemble + AI + rubric validation
      feedbackText = multiRefFeedback + enhancedResult.feedback;

      // Add rubric validation feedback (collapsible details section)
      if (rubricValidationFeedback) {
        feedbackText += rubricValidationFeedback;
      }

      // Add calibration note to feedback if adjustment was applied
      if (calibrationResult && calibrationResult.adjustmentApplied !== 0) {
        feedbackText += formatCalibrationFeedback(calibrationResult);
      }

      // ========================================================================
      // ENHANCED ANTI-GAMING DETECTION v3.0 - Now with Context Awareness
      // Detects keyword stuffing, template copying, AI-generated content
      // Adjusts detection based on game type and player writing history
      // ========================================================================

      scoreBeforeGamingPenalty = score;
      let contextAdjustments: string[] = [];

      try {
        // Get game writing context for context-aware detection
        const gameContext = getGameWritingContext(game.skillCategory);

        // Use context-aware detection (includes player style profiling)
        const contextAwareResult = await detectGamingWithContext(submission, {
          playerId: playerRow.id,
          gameId: game.id,
          skillCategory: game.skillCategory,
          exampleSolution: game.exampleSolution,
          gameContext,
        }, supabase);

        gamingDetectionResult = contextAwareResult;
        contextAdjustments = contextAwareResult.contextAdjustments || [];

        // Apply gaming penalty if detected
        if (gamingDetectionResult.scorePenalty > 0) {
          gamingPenalty = gamingDetectionResult.scorePenalty;
          score = Math.max(0, score - gamingPenalty);
          console.log(`Gaming penalty applied for ${game.id}: -${gamingPenalty} (risk: ${gamingDetectionResult.overallRisk}, score: ${gamingDetectionResult.riskScore.toFixed(1)})`);
        }

        // Log context adjustments
        if (contextAdjustments.length > 0) {
          console.log(`Context adjustments for ${game.id}:`, contextAdjustments);
        }

        // Add gaming feedback if needed
        const gamingFeedback = formatGamingFeedback(gamingDetectionResult);
        if (gamingFeedback) {
          feedbackText = gamingFeedback + feedbackText;
        }

        // Add context adjustment feedback (collapsible details)
        if (contextAdjustments.length > 0) {
          feedbackText += formatContextAdjustmentFeedback(contextAdjustments);
        }

        // Log gaming detection results
        if (gamingDetectionResult.flags.length > 0) {
          console.log(`Gaming flags for ${game.id}:`, gamingDetectionResult.flags);
        }
      } catch (gamingError) {
        console.warn('Gaming detection failed:', gamingError);
        // Continue without gaming detection
      }

      // Build consistency info for logging
      const consistencyInfo = consistencyResult
        ? `AIWeight=${consistencyResult.adjustedAiWeight.toFixed(2)}(was ${consistencyResult.originalAiWeight.toFixed(2)}), ` +
          `ConsistencyConf=${consistencyResult.confidenceLevel}, ` +
          `CrossVal=${consistencyResult.crossValidation?.wasValidated ? (consistencyResult.crossValidation.validationPassed ? 'passed' : 'adjusted') : 'skipped'}, `
        : '';

      console.log(`Enhanced scoring v${SCORING_VERSION}: ` +
        `AI=${enhancedResult.ensemble.components.aiScore}, ` +
        `Validation=${enhancedResult.ensemble.components.validationScore}, ` +
        `Embedding=${Math.round(embeddingSimilarity * 100)}, ` +
        `${consistencyInfo}` +
        `MultiRef=${multiRefScoreAdjustment > 0 ? '+' : ''}${multiRefScoreAdjustment}, ` +
        `Calibration=${calibrationAdjustment > 0 ? '+' : ''}${calibrationAdjustment}, ` +
        `GamingPenalty=${gamingPenalty > 0 ? '-' : ''}${gamingPenalty}, ` +
        `Final=${score}, ` +
        `Confidence=${enhancedResult.ensemble.confidence}%, ` +
        `Integrity=${enhancedResult.integrity.overallRisk}`
      );

      // Log integrity issues if any
      if (enhancedResult.integrity.flags.length > 0) {
        console.log(`Integrity flags for ${game.id}:`, enhancedResult.integrity.flags);
      }
    } else {
      // Fallback: automated-only scoring doesn't use enhanced system
      console.log('Using automated-only scoring (AI unavailable)');
    }

    if (hintPenalty > 0) {
      score = Math.max(0, score - hintPenalty);
      const hintLabel = normalizedHintLevel === 1 ? 'hint' : 'hints';
      const hintPenaltyHtml = `
<div style="background:#111827;padding:10px;border-radius:8px;border:1px solid #f97316;margin-bottom:8px;">
  <p><strong>Hint penalty applied:</strong> -${hintPenalty} points (${normalizedHintLevel} ${hintLabel} used)</p>
</div>`;
      feedbackText = hintPenaltyHtml + feedbackText;
    }

    // Enhance feedback for high scores (85%+)
    const enhancedFeedback = enhanceFeedbackForHighScores(feedbackText, score, game.title);

    // Map current player data early (needed for historical delta calculation)
    const currentPlayer = mapPlayer(playerRow);

    // ========================================================================
    // ENHANCED PEER COMPARISON v3.0
    // Game-specific + skill-category-wide percentiles, top X% rankings,
    // and optional curve mode for competitive games
    // ========================================================================

    let feedbackWithPeer = enhancedFeedback;
    let peerComparisonResult: PeerComparisonResult | null = null;

    try {
      // Calculate comprehensive peer comparison with category-wide stats
      peerComparisonResult = await calculatePeerComparison(
        supabase,
        game.id,
        game.skillCategory,
        score,
        {
          ...DEFAULT_PEER_CONFIG,
          enableCurveMode: false, // Curve mode disabled by default, can be enabled per-game
          enableCategoryPercentiles: true,
          minPeerCount: 5,
          minCategoryGames: 2,
        }
      );

      // Format peer comparison feedback
      if (peerComparisonResult.gameStats || peerComparisonResult.categoryStats) {
        const peerFeedback = formatPeerComparisonFeedback(
          peerComparisonResult,
          score,
          true // Show details
        );

        if (peerFeedback) {
          feedbackWithPeer = peerFeedback + feedbackWithPeer;
        }

        // Log peer comparison stats
        if (peerComparisonResult.gameStats) {
          const gs = peerComparisonResult.gameStats;
          console.log(`Peer comparison for ${game.id}: ` +
            `top ${gs.topPercentage}%, ` +
            `rank #${gs.rank}/${gs.count}, ` +
            `score=${score}, median=${gs.median}, ` +
            `performance=${peerComparisonResult.performanceLevel}`);
        }

        // Log category stats if available
        if (peerComparisonResult.categoryStats) {
          const cs = peerComparisonResult.categoryStats;
          console.log(`Category stats for ${cs.skillCategory}: ` +
            `top ${cs.topPercentage}% across ${cs.gamesIncluded} games, ` +
            `${cs.uniquePlayers} players`);
        }
      }
    } catch (peerErr) {
      console.warn('Enhanced peer comparison failed:', peerErr);
      // Continue without peer comparison
    }

    // ========================================================================
    // PERSONALIZED FEEDBACK - Based on player history and performance patterns
    // ========================================================================

    try {
      const feedbackContext = await buildFeedbackContext(
        supabase,
        currentPlayer.id,
        currentPlayer.name,
        game.id,
        game.title,
        game.skillCategory,
        score
      );

      if (feedbackContext) {
        const personalizedHtml = generatePersonalizedFeedback(feedbackContext);
        if (personalizedHtml) {
          // Add personalized feedback at the end of the main feedback
          feedbackWithPeer = feedbackWithPeer + personalizedHtml;
          console.log(`Generated personalized feedback for ${currentPlayer.id}: ` +
            `level=${feedbackContext.playerAnalysis.performanceLevel}, ` +
            `trend=${feedbackContext.playerAnalysis.trend}, ` +
            `isPersonalBest=${feedbackContext.isPersonalBest}`);
        }
      }
    } catch (personalizedErr) {
      console.warn('Personalized feedback generation failed:', personalizedErr);
      // Continue without personalized feedback
    }

    // ========================================================================
    // SKILL CLUSTERING v1.0 - Cross-game skill progression analysis
    // Tracks skills across related games, not just per-game
    // ========================================================================

    try {
      const clusterAnalysis = await analyzeClusterProgression(
        supabase,
        currentPlayer.id,
        game.id,
        score
      );

      if (clusterAnalysis && (clusterAnalysis.relatedGames.length > 0 || clusterAnalysis.progress)) {
        const clusteringHtml = formatClusteringFeedback(clusterAnalysis, game.title);
        if (clusteringHtml) {
          // Add skill clustering insights after personalized feedback
          feedbackWithPeer = feedbackWithPeer + clusteringHtml;
          console.log(`Generated skill clustering feedback for ${currentPlayer.id}: ` +
            `relatedGames=${clusterAnalysis.relatedGames.length}, ` +
            `insights=${clusterAnalysis.insights.length}, ` +
            `recommendations=${clusterAnalysis.recommendations.length}`);
        }
      }

      // Update player's cluster progress (runs in background)
      updatePlayerClusterProgress(supabase, currentPlayer.id, game.id, score)
        .then(result => {
          if (!result.success && result.error) {
            console.warn('Cluster progress update failed:', result.error);
          }
        })
        .catch(err => console.warn('Cluster progress exception:', err));

      // Log cross-game progression if player has previous attempts
      const previousAttempts = currentPlayer.attempts.filter(a => a.gameId === gameId);
      if (previousAttempts.length > 0) {
        const lastAttempt = previousAttempts[previousAttempts.length - 1];
        logCrossGameProgression(
          supabase,
          currentPlayer.id,
          {
            gameId: lastAttempt.gameId,
            score: lastAttempt.score,
            playedAt: lastAttempt.ts,
          },
          {
            gameId: game.id,
            score,
            playedAt: new Date().toISOString(),
          }
        ).catch(err => console.warn('Cross-game progression logging failed:', err));
      }
    } catch (clusterErr) {
      console.warn('Skill clustering analysis failed:', clusterErr);
      // Continue without clustering feedback - non-critical feature
    }

    // ========================================================================
    // SPACED REPETITION v2.0 - Enhanced with XP bonus, review mode, retention tracking
    // ========================================================================

    let spacedRepetitionHtml = '';
    let xpBonusResult: XpBonusResult | null = null;
    let reviewModeResult: ReviewModeResult | null = null;
    let retentionStats: RetentionStats | null = null;
    let finalScoreWithBonus = score;

    try {
      const skillUpdate = await updateSkillMemory(
        supabase,
        currentPlayer.id,
        game.skillCategory,
        game.id,
        score
      );

      if (skillUpdate) {
        spacedRepetitionHtml = formatSpacedRepetitionFeedback(skillUpdate, game.skillCategory);
        const srSummary = await getSpacedRepetitionSummary(supabase, currentPlayer.id, games);
        const recHtml = formatSpacedRepetitionRecommendations(srSummary.recommendations);
        if (recHtml) {
          spacedRepetitionHtml += recHtml;
        }
      }

      // ========================================================================
      // XP BONUS FOR WEAK SKILLS - Rewards practicing areas that need improvement
      // ========================================================================

      const previousAttemptScore = currentPlayer.attempts
        .filter(a => a.skill === game.skillCategory)
        .slice(-1)[0]?.score ?? null;

      xpBonusResult = await calculateXpBonus(
        supabase,
        currentPlayer.id,
        game.skillCategory,
        game.id,
        score,
        game.difficulty,
        previousAttemptScore
      );

      if (xpBonusResult.bonusXp > 0) {
        finalScoreWithBonus = xpBonusResult.totalXp;
        const xpBonusFeedback = formatXpBonusFeedback(xpBonusResult);
        spacedRepetitionHtml = xpBonusFeedback + spacedRepetitionHtml;

        console.log(`XP bonus for ${game.id}: +${xpBonusResult.bonusXp} ` +
          `(base=${score}, total=${finalScoreWithBonus}, ` +
          `breakdown: ${xpBonusResult.bonusBreakdown.map(b => b.type).join(', ')})`);
      }

      // ========================================================================
      // REVIEW MODE - Reduced scoring pressure for learning
      // ========================================================================

      // Get skill memory for review mode check
      const skillMemories = await getPlayerSkillMemories(supabase, currentPlayer.id);
      const currentSkillMemory = skillMemories.find(m => m.skillCategory === game.skillCategory) || null;

      // Check if review mode should be enabled (auto-enabled for weak skills)
      const isReviewModeRequested = false; // Could be passed in request body
      const shouldReview = shouldEnableReviewMode(currentSkillMemory, isReviewModeRequested);

      if (shouldReview) {
        reviewModeResult = applyReviewMode(score, currentSkillMemory, {
          ...REVIEW_MODE_CONFIG,
          enabled: true,
        });

        if (reviewModeResult.isReviewMode) {
          const reviewFeedback = formatReviewModeFeedback(reviewModeResult);
          spacedRepetitionHtml = reviewFeedback + spacedRepetitionHtml;

          // In review mode, use reduced XP contribution
          finalScoreWithBonus = Math.max(
            reviewModeResult.xpContribution,
            score // Always give at least the base score
          );

          console.log(`Review mode active for ${game.id}: ` +
            `original=${score}, contribution=${reviewModeResult.xpContribution}`);
        }
      }

      // ========================================================================
      // RETENTION TRACKING - Track skill retention over time
      // ========================================================================

      // Record retention data point
      const bestScore = currentSkillMemory?.bestScore ?? score;
      const lastAttemptAt = currentSkillMemory?.lastAttemptAt ?? null;

      recordRetentionDataPoint(
        supabase,
        currentPlayer.id,
        game.skillCategory,
        score,
        bestScore,
        lastAttemptAt
      ).catch(err => console.warn('Retention recording failed:', err));

      // Get retention stats for feedback (if enough data)
      retentionStats = await getRetentionStats(
        supabase,
        currentPlayer.id,
        game.skillCategory
      );

      if (retentionStats) {
        const retentionFeedback = formatRetentionFeedback(retentionStats);
        if (retentionFeedback) {
          spacedRepetitionHtml += retentionFeedback;
        }

        console.log(`Retention stats for ${currentPlayer.id}/${game.skillCategory}: ` +
          `rate=${Math.round(retentionStats.retentionRate * 100)}%, ` +
          `trend=${retentionStats.trend}, ` +
          `optimalInterval=${retentionStats.optimalReviewInterval}d`);
      }

    } catch (srErr) {
      console.warn('Spaced repetition update failed:', srErr);
      // Continue without spaced repetition feedback
    }

    // Use bonus-adjusted score for total player score
    const scoreForTotal = finalScoreWithBonus;

    // Historical delta vs last attempt on this game
    const gameAttempts = currentPlayer.attempts.filter(a => a.gameId === gameId);
    if (gameAttempts.length > 0) {
      const lastScore = gameAttempts[gameAttempts.length - 1].score;
      const delta = score - lastScore;
      const icon = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';
      const msg = delta !== 0
        ? `${icon} ${delta > 0 ? '+' : ''}${delta} points from last attempt (${lastScore}→${score})`
        : `Same score as last attempt (${score}/100)`;
      feedbackWithPeer = `<p style="color:#a78bfa;"><strong>${msg}</strong></p>` + feedbackWithPeer;
    }
    const attempt: Attempt = {
      gameId: game.id,
      gameTitle: override?.title || game.title,
      submission,
      score,
      skill: game.skillCategory,
      ts: new Date().toISOString(),
      feedback: feedbackWithPeer,
    };

    const updatedAttempts = [...(currentPlayer.attempts || []), attempt];
    const updatedPlayer: Player = {
      ...currentPlayer,
      score: currentPlayer.score + scoreForTotal, // Use bonus-adjusted score
      attempts: updatedAttempts,
      pinHash: currentPlayer.pinHash,
    };

    const newAchievements = checkNewAchievements(updatedPlayer);
    const unlockedIds = new Set((currentPlayer.achievements || []).map(a => a.id));
    const mergedAchievements = [
      ...(currentPlayer.achievements || []),
      ...newAchievements
        .filter(def => !unlockedIds.has(def.id))
        .map(def => ({
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
          category: def.category,
          unlockedAt: new Date().toISOString(),
        })),
    ];

    const { data: savedPlayer, error: updateError } = await supabase
      .from('players')
      .update({
        score: updatedPlayer.score,
        progress: {
          attempts: updatedAttempts,
          achievements: mergedAchievements,
          pinHash: currentPlayer.pinHash || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentPlayer.id)
      .select()
      .single();

    if (updateError || !savedPlayer) {
      return sendError(
        res,
        500,
        'save_attempt_failed',
        'We could not save your attempt. Please retry in a few seconds.',
        process.env.NODE_ENV === 'development'
          ? { supabaseError: updateError?.message, code: updateError?.code }
          : undefined
      );
    }

    await submitChallengeScoreIfNeeded(supabase, currentPlayer.id, game.id, score);

    // ========================================================================
    // SCORING ANALYTICS - Log scoring data for observability
    // Tracks score distributions, disagreements, confidence, and player history
    // ========================================================================

    const processingTimeMs = Date.now() - processingStartTime;
    const integritySignals = enhancedResult?.integrity?.signals || {};
    const gamingRiskLevel = calculateGamingRiskLevel(integritySignals);

    // Log analytics in background (don't block response)
    logScoringAnalytics(supabase as any, {
      attemptId: `${currentPlayer.id}_${game.id}_${Date.now()}`,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      gameId: game.id,
      gameTitle: game.title,
      gameType: 'individual',
      finalScore: score,
      aiScore: enhancedResult?.ensemble?.components?.aiScore,
      validationScore: validation?.score,
      embeddingSimilarity,
      multiReferenceScore: multiRefScoreAdjustment !== 0 ? score - multiRefScoreAdjustment : undefined,
      aiWeight: enhancedResult?.ensemble?.components?.aiWeight,
      validationWeight: enhancedResult?.ensemble?.components?.validationWeight,
      embeddingWeight: enhancedResult?.ensemble?.components?.embeddingWeight,
      multiReferenceWeight: multiRefScoreAdjustment !== 0 ? 0.10 : undefined,
      aiConfidence: enhancedResult?.ensemble?.confidence ? enhancedResult.ensemble.confidence / 100 : undefined,
      integritySignals,
      gamingRiskLevel,
      submissionLength: submission.length,
      submissionWordCount: countWords(submission),
      processingTimeMs,
      referencesCompared: multiRefReferencesCompared,
      verifiedReferencesCount: multiRefVerifiedCount,
      bestReferenceSimilarity: multiRefBestSimilarity,
      scoringVersion: SCORING_VERSION,
    }).then(result => {
      if (result.error) {
        console.warn('Analytics logging failed:', result.error);
      } else {
        console.log(`Analytics logged: ${result.analyticsId}`);
      }
    }).catch(err => {
      console.warn('Analytics logging exception:', err);
    });

    // Log RAG retrieval analytics (in background)
    if (ragRetrievalResult && ragRetrievalResult.articles.length > 0) {
      logKnowledgeRetrieval(supabase, {
        attemptId: `${currentPlayer.id}_${game.id}_${Date.now()}`,
        gameId: game.id,
        skillCategory: game.skillCategory,
        queryText: submission,
        articlesRetrieved: ragRetrievalResult.articles.map(a => a.id),
        chunksRetrieved: ragRetrievalResult.chunks.map(c => c.id),
        avgSimilarity: ragRetrievalResult.avgSimilarity,
        maxSimilarity: ragRetrievalResult.maxSimilarity,
        retrievalTimeMs: ragRetrievalResult.retrievalTimeMs,
        finalScore: score,
      }).catch(err => {
        console.warn('RAG retrieval logging failed:', err);
      });
    }

    // Log enhanced gaming detection analytics (in background)
    if (gamingDetectionResult) {
      logGamingDetection(
        supabase,
        `${currentPlayer.id}_${game.id}_${Date.now()}`,
        currentPlayer.id,
        game.id,
        gamingDetectionResult,
        scoreBeforeGamingPenalty,
        score
      ).catch(err => {
        console.warn('Gaming detection logging failed:', err);
      });
    }

    // ========================================================================
    // ADAPTIVE DIFFICULTY - Update player profile and generate recommendations
    // Tracks mastery at each difficulty level and recommends optimal challenges
    // ========================================================================

    let difficultyFeedbackHtml = '';
    try {
      // Update the player's difficulty profile with this attempt
      const difficultyUpdateResult = await updateDifficultyProfile(
        supabase,
        currentPlayer.id,
        game.skillCategory,
        game.difficulty,
        score
      );

      if (difficultyUpdateResult) {
        // Determine player's overall skill level based on previous attempts
        const playerAttempts = currentPlayer.attempts?.length || 0;
        const avgScore = playerAttempts > 0
          ? currentPlayer.attempts.reduce((sum, a) => sum + a.score, 0) / playerAttempts
          : score;
        const playerLevel = avgScore >= 80 ? 'expert' :
          avgScore >= 60 ? 'intermediate' : 'beginner';

        // Generate adaptive feedback based on the update
        const difficultyFeedback = generateDifficultyFeedback(
          score,
          game.difficulty,
          playerLevel,
          difficultyUpdateResult
        );

        // Format as HTML and prepend to feedback
        difficultyFeedbackHtml = formatDifficultyFeedbackHtml(difficultyFeedback, difficultyUpdateResult);

        // Log difficulty transition if promotion/demotion occurred
        if (difficultyUpdateResult.readyForNext || difficultyUpdateResult.shouldDemote) {
          console.log(`Difficulty transition for player ${currentPlayer.id}: ${game.skillCategory} ${game.difficulty} -> ${difficultyUpdateResult.readyForNext ? 'promote' : 'demote'}`);
        }
      }
    } catch (difficultyErr) {
      console.warn('Adaptive difficulty update failed:', difficultyErr);
      // Continue without difficulty feedback - non-critical feature
    }

    // Combine all feedback sections
    const finalFeedback = difficultyFeedbackHtml + spacedRepetitionHtml + feedbackWithPeer;

    // ========================================================================
    // AUTO-POPULATE REFERENCE DATABASE (after successful save)
    // Add high-scoring submissions to reference database for future comparisons
    // ========================================================================

    if (score >= REFERENCE_CONFIG.minScoreThreshold && submissionEmbedding.length > 0) {
      // Run in background - don't block the response
      addReferenceAnswer(supabase, {
        gameId: game.id,
        gameTitle: game.title,
        submission,
        score,
        embedding: submissionEmbedding,
        sourceType: 'player',
        sourcePlayerId: currentPlayer.id,
        sourcePlayerName: currentPlayer.name,
        skillCategory: game.skillCategory,
        difficulty: game.difficulty,
        aiScore: enhancedResult?.ensemble?.components?.aiScore,
        validationScore: validation?.score,
        embeddingSimilarity,
      }).then(refResult => {
        if (refResult.added) {
          console.log(`Added reference answer for ${game.id}: score=${score}, id=${refResult.id}`);
        } else {
          console.log(`Reference not added for ${game.id}: ${refResult.reason}`);
        }
      }).catch(refError => {
        console.warn('Failed to add reference answer:', refError);
      });
    }

    // ========================================================================
    // FEEDBACK QUALITY MONITORING v2.8
    // Track which feedback leads to improved subsequent attempts
    // ========================================================================

    const attemptId = `${currentPlayer.id}_${game.id}_${Date.now()}`;

    const reviewSignal = buildReviewReasons({
      confidence: enhancedResult?.ensemble?.confidence ?? null,
      integrityRisk: enhancedResult?.integrity?.overallRisk ?? null,
      gamingRisk: gamingDetectionResult?.overallRisk ?? null,
      gamingAction: gamingDetectionResult?.recommendedAction ?? null,
      integrityFlags: enhancedResult?.integrity?.flags ?? [],
      gamingFlags: gamingDetectionResult?.flags ?? [],
    });

    if (reviewSignal.shouldReview) {
      enqueueReview(supabase, {
        attemptId,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        gameId: game.id,
        gameTitle: game.title,
        gameType: 'individual',
        score,
        confidence: enhancedResult?.ensemble?.confidence ?? null,
        integrityRisk: enhancedResult?.integrity?.overallRisk ?? null,
        gamingRisk: gamingDetectionResult?.overallRisk ?? null,
        integrityFlags: enhancedResult?.integrity?.flags ?? [],
        gamingFlags: gamingDetectionResult?.flags ?? [],
        reasons: reviewSignal.reasons,
      }).catch(err => console.warn('Review queue enqueue failed:', err));
    }

    if (aiRubricBreakdown && Object.keys(aiRubricBreakdown).length > 0) {
      logRubricCriteriaScores(supabase, {
        attemptId,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        gameId: game.id,
        gameTitle: game.title,
        gameType: 'individual',
        score,
        aiScore: enhancedResult?.ensemble?.components?.aiScore,
        validationScore: validation?.score,
        rubricBreakdown: aiRubricBreakdown,
      }).catch(err => console.warn('Rubric criteria logging failed:', err));
    }

    // 1. Link this attempt as followup to any previous feedback for this game
    linkFollowupAttempt(supabase, currentPlayer.id, game.id, attemptId, score)
      .then(followupResult => {
        if (followupResult?.wasLinked) {
          console.log(`Linked followup: ${game.id} improved ${followupResult.scoreImprovement > 0 ? '+' : ''}${followupResult.scoreImprovement} (${followupResult.effectiveness})`);
        }
      })
      .catch(err => console.warn('Followup linking failed:', err));

    // 2. Record the feedback we're giving for future tracking
    const feedbackComponents: FeedbackComponents = {
      aiGenerated: enhancedResult?.feedback,
      validation: validation?.feedback?.join('; '),
      peerComparison: feedbackWithPeer !== enhancedFeedback ? 'included' : undefined,
      ragEnhanced: ragRetrievalResult?.articles?.length ? 'used' : undefined,
      difficultyAdaptive: difficultyFeedbackHtml || undefined,
      gamingWarning: gamingDetectionResult?.flags?.length ? gamingDetectionResult.flags.join('; ') : undefined,
    };

    const feedbackRecord = createFeedbackRecordFromScoring(
      currentPlayer.id,
      game.id,
      game.skillCategory,
      attemptId,
      score,
      finalFeedback,
      feedbackComponents,
      ragRetrievalResult?.articles?.map(a => a.id),
      ragRetrievalResult?.chunks?.map(c => c.id),
      SCORING_VERSION
    );

    recordFeedback(supabase, feedbackRecord)
      .then(result => {
        if (result.success) {
          console.log(`Feedback recorded for quality tracking: ${result.feedbackId}`);
        }
      })
      .catch(err => console.warn('Feedback recording failed:', err));

    return res.status(200).json({
      score,
      feedback: finalFeedback,
      player: mapPlayer(savedPlayer),
      // v3.1 additions: XP bonus and review mode info
      xpBonus: xpBonusResult ? {
        baseScore: xpBonusResult.baseScore,
        bonusXp: xpBonusResult.bonusXp,
        totalXp: xpBonusResult.totalXp,
      } : null,
      reviewMode: reviewModeResult?.isReviewMode ? {
        originalScore: reviewModeResult.originalScore,
        xpContribution: reviewModeResult.xpContribution,
      } : null,
    });
  } catch (error: unknown) {
    console.error('submitAttempt error:', error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Error stack:', stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendError(
      res,
      500,
      'unexpected_error',
      'Unexpected error. Please try again.',
      process.env.NODE_ENV === 'development' ? { stack, message } : undefined
    );
  }
}
