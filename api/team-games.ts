import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { TeamAttempt, Game } from '../types.js';
import { GoogleGenAI } from '@google/genai';
import { getServiceSupabase, isMissingTableError } from './_lib/supabaseServer.js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import { computeServerValidation } from './_lib/computeValidation.js';
import { rubricByDifficulty } from '../utils/rubrics.js';
import {
  calculateEnhancedScore,
  formatEnsembleScoreFeedback,
  checkSubmissionIntegrity,
  calculateEnsembleScore,
  parseAiResponseWithSchema,
} from './_lib/enhancedScoring.js';
import {
  calculateMultiReferenceScore,
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
} from './_lib/scoringAnalytics.js';
import {
  buildFeedbackContext,
  generatePersonalizedFeedback,
} from './_lib/playerHistoryAnalysis.js';
import {
  analyzeClusterProgression,
  formatClusteringFeedback,
  updatePlayerClusterProgress,
} from './_lib/skillClustering.js';
import {
  updateSkillMemory,
  getSpacedRepetitionSummary,
  formatSpacedRepetitionFeedback,
} from './_lib/spacedRepetition.js';
import { buildReviewReasons, enqueueReview } from './_lib/reviewQueue.js';
import { logRubricCriteriaScores, type RubricBreakdown } from './_lib/rubricTuning.js';
import { logger } from './_lib/logger.js';

const SCORING_VERSION = '2.3.0';

// Team games now use AI scoring like individual games
const GEMINI_MAX_OUTPUT_TOKENS = 600;
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_SECOND_FALLBACK_MODEL = 'gemini-3-flash';
const HINT_PENALTY_POINTS = 3;
const MAX_HINTS = 3;
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

const parseAiResponseStrict = (rawText: string): { score: number; feedback: string; rubricBreakdown: RubricBreakdown } => {
  const parsed = parseAiResponseWithSchema(rawText);
  if (!parsed.success) {
    const error = (parsed as { success: false; error: string }).error;
    throw new Error(error);
  }
  const normalizedScore = Math.max(0, Math.min(100, Math.round(parsed.data.score)));
  return { score: normalizedScore, feedback: parsed.data.feedback, rubricBreakdown: parsed.data.rubricBreakdown || {} };
};

const getModelResponseText = async (
  ai: GoogleGenAI,
  model: string,
  prompt: string
): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    } as any);

    return (response as any).text
      || (response as any).candidates?.[0]?.content?.parts?.[0]?.text
      || (response as any).candidates?.[0]?.text
      || (response as any).response?.text
      || null;
  } catch (error) {
    logger.warn(`Team game model ${model} failed:`, error);
    return null;
  }
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

const mapTeamAttempt = (row: any): TeamAttempt => ({
  id: row.id,
  teamId: row.team_id,
  teamName: row.team_name,
  gameId: row.game_id,
  gameTitle: row.game_title,
  submission: row.submission,
  score: row.score,
  skill: row.skill,
  submittedBy: row.submitted_by,
  submittedByName: row.submitted_by_name,
  ts: row.ts,
  feedback: row.feedback,
});

const getPlayerFromSession = async (req: VercelRequest, supabase: ReturnType<typeof getServiceSupabase>) => {
  const sessionToken = getSessionTokenFromCookie(req);
  if (!sessionToken) return null;

  const { data: player, error } = await supabase
    .from('players')
    .select('id, name')
    .eq('session_token', sessionToken)
    .maybeSingle();

  if (error) throw error;
  return player as { id: string; name: string } | null;
};

const respondMissingTable = (res: VercelResponse, tableHint: string) =>
  res.status(500).json({
    error: `Database table missing (${tableHint}). Run the Supabase SQL migrations in /sql and then reload the schema cache.`,
  });

const computeLeaderboardFallback = async (
  supabase: ReturnType<typeof getServiceSupabase>,
  limitNum: number
) => {
  const [{ data: teams, error: teamsError }, { data: attempts, error: attemptsError }] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, is_active')
      .eq('is_active', true),
    supabase
      .from('team_attempts')
      .select('team_id, game_id, score')
      .range(0, 9999),
  ]);

  if (teamsError) throw teamsError;
  if (attemptsError) throw attemptsError;

  const teamNameById = new Map<string, string>();
  (teams ?? []).forEach((t: any) => teamNameById.set(t.id, t.name));

  const bestByTeamGame = new Map<string, number>();
  (attempts ?? []).forEach((a: any) => {
    if (!a?.team_id || !a?.game_id) return;
    const key = `${a.team_id}:${a.game_id}`;
    const score = typeof a.score === 'number' ? a.score : 0;
    const prev = bestByTeamGame.get(key);
    if (prev === undefined || score > prev) bestByTeamGame.set(key, score);
  });

  const totals = new Map<string, { team_id: string; team_name: string; total_score: number; games_played: number }>();
  (teams ?? []).forEach((t: any) => {
    totals.set(t.id, {
      team_id: t.id,
      team_name: t.name,
      total_score: 0,
      games_played: 0,
    });
  });

  for (const [key, bestScore] of bestByTeamGame.entries()) {
    const [teamId] = key.split(':');
    if (!teamNameById.has(teamId)) continue; // ignore inactive/unknown teams
    const current = totals.get(teamId);
    if (!current) continue;
    current.total_score += bestScore;
    current.games_played += 1;
  }

  const sorted = Array.from(totals.values()).sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    if (b.games_played !== a.games_played) return b.games_played - a.games_played;
    return a.team_name.localeCompare(b.team_name);
  });

  return sorted.slice(0, limitNum).map((row, idx) => ({
    ...row,
    rank: idx + 1,
  }));
};

/**
 * Unified Team Games API Endpoint
 * Handles all team game operations
 *
 * POST /api/team-games?action=submit - Submit team game attempt
 * GET /api/team-games?action=attempts&teamId=xxx - Get team attempts
 * GET /api/team-games?action=leaderboard&limit=50 - Get team game leaderboard
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  try {
    const supabase = getServiceSupabase();

    // GET operations
    if (req.method === 'GET') {
      if (action === 'attempts') {
        const { teamId } = req.query;
        if (!teamId || typeof teamId !== 'string') {
          return res.status(400).json({ error: 'Missing or invalid teamId' });
        }

        const { data: attemptRows, error: attemptError } = await supabase
          .from('team_attempts')
          .select('*')
          .eq('team_id', teamId)
          .order('ts', { ascending: false });

        if (attemptError) {
          if (isMissingTableError(attemptError)) return respondMissingTable(res, 'team_attempts');
          logger.error('Failed to fetch team attempts:', attemptError);
          return res.status(500).json({ error: 'Failed to fetch team attempts' });
        }

        return res.status(200).json((attemptRows ?? []).map(mapTeamAttempt));
      }

      if (action === 'leaderboard') {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit as string, 10) : 50;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          return res.status(400).json({ error: 'Invalid limit parameter (must be 1-100)' });
        }

        // Use the get_team_game_leaderboard function from Supabase
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .rpc('get_team_game_leaderboard', { p_limit: limitNum });

        if (leaderboardError) {
          if (isMissingTableError(leaderboardError)) return respondMissingTable(res, 'team_attempts');
          logger.error('Team leaderboard RPC failed, using fallback:', leaderboardError);

          try {
            const fallback = await computeLeaderboardFallback(supabase, limitNum);
            return res.status(200).json(fallback);
          } catch (fallbackError) {
            logger.error('Team leaderboard fallback failed:', fallbackError);
            return res.status(500).json({
              error: 'Failed to fetch leaderboard',
              details: {
                rpc: (leaderboardError as any)?.message || leaderboardError,
                fallback: (fallbackError as any)?.message || fallbackError,
                hint: 'If this persists, run sql/fix_team_game_leaderboard.sql in Supabase to restore get_team_game_leaderboard.',
              },
            });
          }
        }

        return res.status(200).json(leaderboardData ?? []);
      }

      return res.status(400).json({ error: 'Invalid action parameter' });
    }

    // POST operations
    if (req.method === 'POST') {
      const player = await getPlayerFromSession(req, supabase);
      if (!player) return res.status(401).json({ error: 'Unauthorized - no session' });

      if (action === 'submit') {
        const processingStartTime = Date.now();
        const { teamId, teamName, gameId, gameTitle, submission, skill, hintLevel } = req.body;

        if (!teamId || !teamName || !gameId || !gameTitle || !submission) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        const normalizedHintLevel = Number.isFinite(Number(hintLevel))
          ? Math.max(0, Math.min(MAX_HINTS, Math.floor(Number(hintLevel))))
          : 0;
        const hintPenalty = normalizedHintLevel * HINT_PENALTY_POINTS;

        let teamGames: any[] | null = null;
        try {
          const mod = await import('../data/teamGames.js');
          teamGames = (mod as any).teamGames || null;
        } catch (err) {
          logger.error('Failed to load teamGames data for validation:', err);
          return res.status(500).json({ error: 'Team game validation data unavailable' });
        }

        const game = (teamGames || []).find((g: any) => g.id === gameId);
        if (!game) {
          return res.status(404).json({ error: 'Team game not found' });
        }

        // Verify player is a member of the team
        const { data: memberRow, error: memberError } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('player_id', player.id)
          .maybeSingle();

        if (memberError) {
          if (isMissingTableError(memberError)) return respondMissingTable(res, 'team_members');
          return res.status(500).json({ error: 'Failed to verify team membership' });
        }

        if (!memberRow) {
          return res.status(403).json({ error: 'You must be a team member to submit team game attempts' });
        }

        // Check if team already submitted for this game (1 attempt per game limit)
        const { data: existingTeamAttempt, error: checkError } = await supabase
          .from('team_attempts')
          .select('id')
          .eq('team_id', teamId)
          .eq('game_id', gameId)
          .maybeSingle();

        if (checkError && !isMissingTableError(checkError)) {
          logger.error('Failed to check existing team attempt:', checkError);
          return res.status(500).json({ error: 'Failed to verify submission status' });
        }

        if (existingTeamAttempt) {
          return res.status(409).json({
            error: 'Your team has already submitted for this game. Only one submission per team per game is allowed.'
          });
        }

        // Compute server-side validation first
        const validation = computeServerValidation(game, submission);

        // Try to use AI scoring for team games (same as individual games)
        let computedScore = validation.score;
        let computedFeedback: string;
        let usedAiScoring = false;

        // Variables for analytics tracking
        let aiScore: number | undefined;
        let aiRubricBreakdown: RubricBreakdown | null = null;
        let embeddingSimilarityTracked = 0;
        let multiRefReferencesCompared = 0;
        let multiRefVerifiedCount = 0;
        let multiRefBestSimilarity: number | undefined;
        let multiRefScoreAdjustmentTracked = 0;
        let integritySignalsTracked: Record<string, unknown> = {};
        let integrityRiskTracked: string | undefined;
        let integrityFlagsTracked: string[] = [];
        let ensembleConfidence: number | undefined;
        let aiWeightTracked: number | undefined;
        let validationWeightTracked: number | undefined;
        let embeddingWeightTracked: number | undefined;

        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey });

            // Generate AI score
            const rubric = rubricByDifficulty[game.difficulty as 'easy' | 'medium' | 'hard'];
            const rubricText = rubric.map(r => `- ${r.criteria} (${r.points} pts): ${r.description}`).join('\n');

            const prompt = `You are an AI coach scoring a TEAM submission for a sourcing challenge.

## GAME: ${gameTitle}
Task: ${game.task}
Difficulty: ${game.difficulty}
This is a TEAM challenge - evaluate for collaborative approaches and team strategy.

## RUBRIC (100 points total)
${rubricText}

## AUTOMATED VALIDATION
Score: ${validation.score}/100
Issues: ${validation.feedback.length > 0 ? validation.feedback.join('; ') : 'None'}
Strengths: ${validation.strengths.length > 0 ? validation.strengths.join('; ') : 'None'}

## TEAM SUBMISSION
"${submission}"

Score this submission and provide feedback. Return JSON only using this structure:
{
  "score": <0-100>,
  "dimensions": { "technicalAccuracy": <number>, "creativity": <number>, "completeness": <number>, "clarity": <number>, "bestPractices": <number> },
  "skillsRadar": { "${game.skillCategory}": <number> },
  "rubricBreakdown": { "<criterion>": { "points": <number>, "maxPoints": <number>, "reasoning": "<brief explanation>" } },
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"],
  "feedback": "<HTML feedback with strengths, areas for improvement, and team-specific tips>"
}`;

            const responseText =
              await getModelResponseText(ai, 'gemini-2.5-flash', prompt)
              || await getModelResponseText(ai, GEMINI_FALLBACK_MODEL, prompt)
              || await getModelResponseText(ai, GEMINI_SECOND_FALLBACK_MODEL, prompt);

            if (responseText) {
              try {
                const parsed = parseAiResponseStrict(responseText);
                aiScore = parsed.score;
                const aiFeedback = parsed.feedback || '';
                aiRubricBreakdown = parsed.rubricBreakdown || null;

                // Calculate embedding similarity if example solution exists
                let embeddingSimilarity = 0;
                let submissionEmbedding: number[] = [];

                if (game.exampleSolution) {
                  try {
                    const [subEmbed, exEmbed] = await Promise.all([
                      ai.models.embedContent({
                        model: 'text-embedding-004',
                        content: { parts: [{ text: submission }] }
                      } as any),
                      ai.models.embedContent({
                        model: 'text-embedding-004',
                        content: { parts: [{ text: game.exampleSolution }] }
                      } as any),
                    ]);

                    submissionEmbedding = (subEmbed as any)?.embedding?.values || [];
                    const exVec = (exEmbed as any)?.embedding?.values || [];

                    if (submissionEmbedding.length > 0 && exVec.length > 0) {
                      let dot = 0, normA = 0, normB = 0;
                      for (let i = 0; i < submissionEmbedding.length; i++) {
                        dot += submissionEmbedding[i] * exVec[i];
                        normA += submissionEmbedding[i] * submissionEmbedding[i];
                        normB += exVec[i] * exVec[i];
                      }
                      const mag = Math.sqrt(normA) * Math.sqrt(normB);
                      embeddingSimilarity = mag > 0 ? dot / mag : 0;
                    }
                  } catch (embedErr) {
                    logger.warn('Team game embedding similarity failed:', embedErr);
                  }
                }

                // Track embedding similarity for analytics
                embeddingSimilarityTracked = embeddingSimilarity;

                // Multi-reference scoring for team games
                let multiRefFeedback = '';
                let multiRefScoreAdjustment = 0;

                if (submissionEmbedding.length > 0) {
                  try {
                    const [refStats, multiRefResult] = await Promise.all([
                      getReferenceStats(supabase, gameId),
                      calculateMultiReferenceScore(supabase, gameId, submissionEmbedding),
                    ]);

                    if (multiRefResult.references.length > 0) {
                      // Track for analytics
                      multiRefReferencesCompared = multiRefResult.references.length;
                      multiRefVerifiedCount = multiRefResult.references.filter(r => r.isVerified).length;
                      multiRefBestSimilarity = multiRefResult.bestMatchSimilarity;

                      const multiRefWeight = calculateMultiReferenceWeight(refStats);
                      if (multiRefWeight > 0) {
                        const similarityBonus = (multiRefResult.averageSimilarity - 0.5) * 20;
                        multiRefScoreAdjustment = Math.round(similarityBonus * multiRefWeight * 10);
                        multiRefScoreAdjustmentTracked = multiRefScoreAdjustment;
                        multiRefFeedback = formatMultiReferenceFeedback(multiRefResult, refStats);
                        const peerInsightHtml = buildPeerComparisonInsights(submission, multiRefResult.references);
                        if (peerInsightHtml) {
                          multiRefFeedback += peerInsightHtml;
                        }

                        logger.info(`Team multi-reference: ${multiRefResult.references.length} refs, ` +
                          `avgSim=${(multiRefResult.averageSimilarity * 100).toFixed(1)}%, ` +
                          `adjustment=${multiRefScoreAdjustment > 0 ? '+' : ''}${multiRefScoreAdjustment}`);
                      }
                    }
                  } catch (multiRefErr) {
                    logger.warn('Team multi-reference scoring failed:', multiRefErr);
                  }
                }

                // Use ensemble scoring for team games too
                const ensemble = calculateEnsembleScore(
                  aiScore,
                  validation.score,
                  embeddingSimilarity,
                  { hasExampleSolution: !!game.exampleSolution }
                );

                // Track ensemble data for analytics
                ensembleConfidence = ensemble.confidence;
                aiWeightTracked = ensemble.components?.aiWeight;
                validationWeightTracked = ensemble.components?.validationWeight;
                embeddingWeightTracked = ensemble.components?.embeddingWeight;

                // Check submission integrity
                const integrity = checkSubmissionIntegrity(
                  submission,
                  game.exampleSolution,
                  embeddingSimilarity
                );

                // Track integrity signals for analytics
                integritySignalsTracked = integrity.signals || {};
                integrityRiskTracked = integrity.overallRisk;
                integrityFlagsTracked = integrity.flags || [];

                // Apply integrity penalties
                let finalScore = ensemble.finalScore;
                if (integrity.signals.isExactCopy) {
                  finalScore = Math.min(finalScore, 50);
                } else if (integrity.overallRisk === 'high') {
                  finalScore = Math.round(finalScore * 0.85);
                }

                // Apply multi-reference adjustment
                if (multiRefScoreAdjustment !== 0) {
                  finalScore = Math.max(0, Math.min(100, finalScore + multiRefScoreAdjustment));
                }

                computedScore = finalScore;

                // Format feedback with multi-reference + ensemble info
                const ensembleFeedbackHtml = formatEnsembleScoreFeedback(ensemble, integrity);
                computedFeedback = JSON.stringify({
                  html: multiRefFeedback + ensembleFeedbackHtml + aiFeedback,
                  feedback: validation.feedback,
                  strengths: validation.strengths,
                  checks: validation.checks ?? {},
                  ensemble: {
                    ai: aiScore,
                    validation: validation.score,
                    embedding: Math.round(embeddingSimilarity * 100),
                    multiRefAdjustment: multiRefScoreAdjustment,
                    final: computedScore,
                    confidence: ensemble.confidence,
                  },
                  integrity: integrity.overallRisk,
                  aiScored: true,
                  computedAt: new Date().toISOString(),
                });

                usedAiScoring = true;
                logger.info(`Team game AI scoring: AI=${aiScore}, Validation=${validation.score}, ` +
                  `Embedding=${Math.round(embeddingSimilarity * 100)}, MultiRef=${multiRefScoreAdjustment > 0 ? '+' : ''}${multiRefScoreAdjustment}, ` +
                  `Final=${computedScore}`);

                // Auto-populate reference database with high-scoring team submissions
                if (computedScore >= REFERENCE_CONFIG.minScoreThreshold && submissionEmbedding.length > 0) {
                  addReferenceAnswer(supabase, {
                    gameId,
                    gameTitle,
                    submission,
                    score: computedScore,
                    embedding: submissionEmbedding,
                    sourceType: 'player',
                    sourcePlayerId: player.id,
                    sourcePlayerName: `${teamName} (${player.name})`,
                    skillCategory: game.skillCategory,
                    difficulty: game.difficulty,
                    aiScore,
                    validationScore: validation.score,
                    embeddingSimilarity,
                  }).then(refResult => {
                    if (refResult.added) {
                      logger.info(`Added team reference for ${gameId}: score=${computedScore}`);
                    }
                  }).catch(err => logger.warn('Failed to add team reference:', err));
                }
              } catch (parseErr) {
                logger.warn('Team AI response parse failed:', parseErr);
              }
            }
          } catch (aiError) {
            logger.warn('Team game AI scoring failed, using validation only:', aiError);
          }
        }

        // Fallback to validation-only scoring
        if (!usedAiScoring) {
          computedFeedback = JSON.stringify({
            feedback: validation.feedback,
            strengths: validation.strengths,
            checks: validation.checks ?? {},
            serverValidated: true,
            aiScored: false,
            computedAt: new Date().toISOString(),
          });
        }

        if (hintPenalty > 0) {
          computedScore = Math.max(0, computedScore - hintPenalty);
          const hintLabel = normalizedHintLevel === 1 ? 'hint' : 'hints';
          const hintPenaltyHtml = `
<div style="background:#111827;padding:10px;border-radius:8px;border:1px solid #f97316;margin-bottom:8px;">
  <p><strong>Hint penalty applied:</strong> -${hintPenalty} points (${normalizedHintLevel} ${hintLabel} used)</p>
</div>`;
          const feedbackObj = JSON.parse(computedFeedback);
          feedbackObj.html = hintPenaltyHtml + (feedbackObj.html || '');
          feedbackObj.hintPenalty = hintPenalty;
          feedbackObj.hintsUsed = normalizedHintLevel;
          computedFeedback = JSON.stringify(feedbackObj);
        }

        // ========================================================================
        // PERSONALIZED FEEDBACK - Based on player history for team game submitter
        // ========================================================================

        try {
          const feedbackContext = await buildFeedbackContext(
            supabase,
            player.id,
            player.name,
            gameId,
            gameTitle,
            game.skillCategory,
            computedScore
          );

          if (feedbackContext) {
            const personalizedHtml = generatePersonalizedFeedback(feedbackContext);
            if (personalizedHtml) {
              // Parse current feedback JSON and add personalized HTML
              const feedbackObj = JSON.parse(computedFeedback);
              feedbackObj.html = (feedbackObj.html || '') + personalizedHtml;
              feedbackObj.personalized = true;
              computedFeedback = JSON.stringify(feedbackObj);

              logger.info(`Generated personalized feedback for team submitter ${player.id}: ` +
                `level=${feedbackContext.playerAnalysis.performanceLevel}, ` +
                `trend=${feedbackContext.playerAnalysis.trend}`);
            }
          }
        } catch (personalizedErr) {
          logger.warn('Team personalized feedback generation failed:', personalizedErr);
          // Continue without personalized feedback
        }

        // ========================================================================
        // SKILL CLUSTERING v1.0 - Cross-game skill progression for team games
        // ========================================================================

        try {
          const clusterAnalysis = await analyzeClusterProgression(
            supabase,
            player.id,
            gameId,
            computedScore
          );

          if (clusterAnalysis && (clusterAnalysis.relatedGames.length > 0 || clusterAnalysis.progress)) {
            const clusteringHtml = formatClusteringFeedback(clusterAnalysis, gameTitle);
            if (clusteringHtml) {
              // Add clustering feedback to feedback JSON
              const feedbackObj = JSON.parse(computedFeedback);
              feedbackObj.html = (feedbackObj.html || '') + clusteringHtml;
              feedbackObj.clustering = true;
              computedFeedback = JSON.stringify(feedbackObj);

              logger.info(`Generated skill clustering for team submitter ${player.id}: ` +
                `relatedGames=${clusterAnalysis.relatedGames.length}`);
            }
          }

          // Update player's cluster progress (runs in background)
          updatePlayerClusterProgress(supabase, player.id, gameId, computedScore)
            .catch(err => logger.warn('Team cluster progress update failed:', err));
        } catch (clusterErr) {
          logger.warn('Team skill clustering failed:', clusterErr);
          // Continue without clustering feedback
        }

        // ========================================================================
        // SPACED REPETITION v1.0 - Weak-skill reinforcement for team submitters
        // ========================================================================

        try {
          const skillUpdate = await updateSkillMemory(
            supabase,
            player.id,
            game.skillCategory,
            gameId,
            computedScore
          );

          if (skillUpdate) {
            let srHtml = formatSpacedRepetitionFeedback(skillUpdate, game.skillCategory);
            const srSummary = await getSpacedRepetitionSummary(
              supabase,
              player.id,
              teamGames || []
            );
            const recHtml = formatSpacedRepetitionRecommendations(srSummary.recommendations);
            if (recHtml) srHtml += recHtml;

            if (srHtml) {
              const feedbackObj = JSON.parse(computedFeedback);
              feedbackObj.html = (feedbackObj.html || '') + srHtml;
              feedbackObj.spacedRepetition = true;
              computedFeedback = JSON.stringify(feedbackObj);
            }
          }
        } catch (srErr) {
          logger.warn('Team spaced repetition update failed:', srErr);
        }

        // Insert the team attempt
        const { data: attemptRow, error: attemptError } = await supabase
          .from('team_attempts')
          .insert({
            team_id: teamId,
            team_name: teamName,
            game_id: gameId,
            game_title: gameTitle,
            submission: submission,
            score: computedScore,
            skill: skill,
            submitted_by: player.id,
            submitted_by_name: player.name,
            feedback: computedFeedback,
          })
          .select()
          .single();

        if (attemptError) {
          if (isMissingTableError(attemptError)) return respondMissingTable(res, 'team_attempts');
          logger.error('Failed to insert team attempt:', attemptError);
          return res.status(500).json({ error: 'Failed to submit team game attempt' });
        }

        if (aiRubricBreakdown && Object.keys(aiRubricBreakdown).length > 0) {
          logRubricCriteriaScores(supabase, {
            attemptId: attemptRow.id ?? `${teamId}_${gameId}_${Date.now()}`,
            playerId: player.id,
            playerName: player.name,
            gameId,
            gameTitle,
            gameType: 'team',
            score: computedScore,
            aiScore,
            validationScore: validation.score,
            rubricBreakdown: aiRubricBreakdown,
          }).catch(err => logger.warn('Team rubric criteria logging failed:', err));
        }

        const reviewSignal = buildReviewReasons({
          confidence: ensembleConfidence ?? null,
          integrityRisk: integrityRiskTracked ?? null,
          gamingRisk: null,
          gamingAction: null,
          integrityFlags: integrityFlagsTracked,
          gamingFlags: undefined,
        });

        if (reviewSignal.shouldReview) {
          enqueueReview(supabase, {
            attemptId: attemptRow.id ?? `${teamId}_${gameId}_${Date.now()}`,
            playerId: player.id,
            playerName: player.name,
            gameId,
            gameTitle,
            gameType: 'team',
            score: computedScore,
            confidence: ensembleConfidence ?? null,
            integrityRisk: integrityRiskTracked ?? null,
            gamingRisk: null,
            integrityFlags: Array.isArray((integritySignalsTracked as any)?.flags)
              ? (integritySignalsTracked as any).flags
              : undefined,
            gamingFlags: undefined,
            reasons: reviewSignal.reasons,
          }).catch(err => logger.warn('Team review queue enqueue failed:', err));
        }

        // Log scoring analytics for team games (in background)
        const processingTimeMs = Date.now() - processingStartTime;
        const gamingRiskLevel = calculateGamingRiskLevel(integritySignalsTracked);

        logScoringAnalytics(supabase, {
          attemptId: attemptRow.id,
          playerId: player.id,
          playerName: player.name,
          gameId,
          gameTitle,
          gameType: 'team',
          teamId,
          teamName,
          finalScore: computedScore,
          aiScore,
          validationScore: validation.score,
          embeddingSimilarity: embeddingSimilarityTracked,
          multiReferenceScore: multiRefScoreAdjustmentTracked !== 0 ? computedScore - multiRefScoreAdjustmentTracked : undefined,
          aiWeight: aiWeightTracked,
          validationWeight: validationWeightTracked,
          embeddingWeight: embeddingWeightTracked,
          multiReferenceWeight: multiRefScoreAdjustmentTracked !== 0 ? 0.10 : undefined,
          aiConfidence: ensembleConfidence ? ensembleConfidence / 100 : undefined,
          integritySignals: integritySignalsTracked,
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
            logger.warn('Team analytics logging failed:', result.error);
          } else {
            logger.info(`Team analytics logged: ${result.analyticsId}`);
          }
        }).catch(err => {
          logger.warn('Team analytics logging exception:', err);
        });

        return res.status(201).json(mapTeamAttempt(attemptRow));
      }

      return res.status(400).json({ error: 'Invalid action parameter' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    logger.error('Error in team-games endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
