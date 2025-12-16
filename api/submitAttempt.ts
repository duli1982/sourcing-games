import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { games } from './_lib/data/games.js';
import { Attempt, Player } from '../types.js';
import { checkNewAchievements } from './_lib/data/achievements.js';
import { rubricByDifficulty } from '../utils/rubrics.js';

const GEMINI_MAX_OUTPUT_TOKENS = 120;
const GEMINI_PROMPT_CHAR_LIMIT = 2800;
const GEMINI_FALLBACK_MODEL = 'gemini-1.5-flash';
const promptCache = new Map<string, string>();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

const mapPlayer = (row: any): Player => ({
  id: row.id,
  name: row.name,
  score: row.score ?? 0,
  sessionToken: row.session_token,
  attempts: row.progress?.attempts || [],
  achievements: row.progress?.achievements || [],
  pinHash: row.progress?.pinHash || undefined,
});

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
 * Extracts the JSON payload from the model response and validates its shape.
 * Throws on any schema violation to avoid silently accepting malformed output.
 */
const parseAiResponse = (rawText: string): { score: number; feedback: string } => {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }

  const jsonSlice = cleaned.slice(start, end + 1);
  let parsed: any;

  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    throw new Error('Model response contained invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Model response JSON is not an object');
  }

  if (typeof parsed.score !== 'number' || Number.isNaN(parsed.score)) {
    throw new Error('Model response missing numeric score');
  }

  if (typeof parsed.feedback !== 'string') {
    throw new Error('Model response missing feedback string');
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(parsed.score)));
  const normalizedFeedback = normalizeFeedbackHtml(parsed.feedback);

  return { score: normalizedScore, feedback: normalizedFeedback };
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

  try {
    const { sessionToken, gameId, submission, validation, skillLevel } = (req.body ?? {}) as {
      sessionToken?: string;
      gameId?: string;
      submission?: string;
      validation?: any; // ValidationResult
      skillLevel?: 'beginner' | 'intermediate' | 'expert';
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

    const game = games.find(g => g.id === gameId);
    if (!game) {
      return sendError(res, 404, 'game_not_found', 'That game is unavailable. Please refresh and try again.');
    }

    // Initialize Supabase client once for all database operations
    const supabase = getSupabase();

    // Apply game override if exists
    let override: any = null;
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

    if (override && override.active === false) {
      return sendError(res, 404, 'game_inactive', 'This game is currently inactive.');
    }

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

    // Rate Limiting: Check last attempt timestamp
    const attempts = playerRow.progress?.attempts || [];
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
2. Explain the "why" behind each issue, not just identify it
3. Provide concrete examples showing wrong vs. right approaches
4. End with 2-3 specific, actionable next steps
5. Use an encouraging but honest tone - celebrate wins, be direct about gaps

Required JSON Structure:
{
  "score": number, // Integer between 0 and 100
  "feedback": "string" // HTML format with <strong>, <ul>, <li>, <p>. Structure:
                        // 1. What worked well (even if only 1-2 things)
                        // 2. What needs improvement (specific issues)
                        // 3. Why it matters (context/impact)
                        // 4. How to improve (concrete examples)
                        // 5. Next steps (2-3 actionable items)
}

Example Response:
{
  "score": 65,
  "feedback": "<p><strong>What worked well:</strong></p><ul><li>You included key skills (React, Node.js)</li><li>You used AND/OR operators</li></ul><p><strong>What needs improvement:</strong></p><ul><li>Missing parentheses around OR groups - this can return unintended results</li><li>No location targeting - you'll get global results instead of Vienna-specific</li></ul><p><strong>Why this matters:</strong> Without parentheses, 'React OR Vue AND developer' searches for (React) OR (Vue AND developer), not (React OR Vue) AND (developer).</p><p><strong>How to fix:</strong><br/>❌ React OR Vue AND developer<br/>✅ (React OR Vue) AND developer</p><p><strong>Next steps:</strong></p><ul><li>Add parentheses around all OR groups</li><li>Include location: (Vienna OR Wien)</li><li>Test your search and refine</li></ul>"
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

    const maxPromptLength = GEMINI_PROMPT_CHAR_LIMIT + 500;
    const promptHead = `${promptBase}${skillContext}${validationContext}${rubricContext}`;
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
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: trimmedPrompt }] }],
      config: {
        temperature: 0.35,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        candidateCount: 1,
      },
    } as any);

    console.log('Gemini full response:', JSON.stringify(response, null, 2));

    // Extract text - using type assertion to handle dynamic Gemini SDK response structure
    const geminiResponse = response as any;
    let responseText = geminiResponse.text
      || geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text
      || geminiResponse.candidates?.[0]?.text
      || geminiResponse.response?.text;

    if (!responseText) {
      console.error('Gemini response structure:', JSON.stringify(response, null, 2));
      return sendError(res, 500, 'empty_model_response', 'AI feedback is temporarily unavailable. Please try again.');
    }

    // Strict JSON parsing with schema validation
    let score: number;
    let feedbackText: string;
    let usedAutomatedOnly = false;

    try {
      const parsed = parseAiResponse(responseText);
      score = parsed.score;
      feedbackText = parsed.feedback;
      promptCache.set(game.id, trimmedPrompt);
    } catch (parseError: any) {
      console.error('Failed to parse AI response:', parseError?.message);
      console.error('Raw AI response text:', responseText);

      try {
        const fallbackPrompt = promptCache.get(game.id) || `
You are an AI coach. Skill level: ${userSkillLevel}.
Submission: """${submission}"""
Automated score: ${validation?.score ?? 'n/a'}
Automated feedback: ${Array.isArray(validation?.feedback) ? validation?.feedback.join('; ') : 'n/a'}

Return JSON only: {"score": <0-100 integer>, "feedback": "<HTML feedback>"}.
Keep feedback concise, structured, and in HTML (no markdown fences).
`;
        const retryResponse = await ai.models.generateContent({
          model: GEMINI_FALLBACK_MODEL,
          contents: [{ role: 'user', parts: [{ text: fallbackPrompt }] }],
          config: {
            temperature: 0.2,
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
            candidateCount: 1,
          },
        } as any);
        const retryText = (retryResponse as any).text
          || (retryResponse as any).candidates?.[0]?.content?.parts?.[0]?.text
          || (retryResponse as any).candidates?.[0]?.text
          || (retryResponse as any).response?.text;

        if (!retryText) {
          throw new Error('Empty retry response');
        }

        const parsedRetry = parseAiResponse(retryText);
        score = parsedRetry.score;
        feedbackText = parsedRetry.feedback;
        promptCache.set(game.id, fallbackPrompt);
      } catch (retryError) {
        console.error('Simplified retry failed:', retryError);

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
    // Enhance feedback for high scores (85%+)
    const enhancedFeedback = enhanceFeedbackForHighScores(feedbackText, score, game.title);

    // Map current player data early (needed for historical delta calculation)
    const currentPlayer = mapPlayer(playerRow);

    let feedbackWithPeer = enhancedFeedback;
    try {
      const { data: peerRows } = await supabase.from('players').select('progress');
      const peerScores: number[] = [];
      peerRows?.forEach(row => {
        const attemptsArr = row?.progress?.attempts || [];
        attemptsArr.forEach((a: any) => {
          if (a?.gameId === game.id && typeof a.score === 'number') {
            peerScores.push(a.score);
          }
        });
      });

      const peerStats = computePeerStats(peerScores, score);
      if (peerStats && peerStats.count >= 5) {
        const peerBlock = `
<div style="background:#0b1220;padding:10px;border-radius:8px;border:1px solid #0ea5e9;margin-bottom:10px;">
  <p><strong>Peer comparison</strong></p>
  <p>Most players score between ${peerStats.p15}-${peerStats.p85} on this game (n=${peerStats.count}).</p>
  <p>Your score: ${score} - around the ${peerStats.percentile}th percentile.</p>
</div>`;
        feedbackWithPeer = peerBlock + feedbackWithPeer;
      }
    } catch (peerErr) {
      console.warn('Peer stats lookup failed', peerErr);
    }

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
      score: currentPlayer.score + score,
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

    return res.status(200).json({
      score,
      feedback: feedbackWithPeer,
      player: mapPlayer(savedPlayer),
    });
  } catch (error: any) {
    console.error('submitAttempt error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    const message = error?.message ?? 'Unknown error';
    return sendError(
      res,
      500,
      'unexpected_error',
      'Unexpected error. Please try again.',
      process.env.NODE_ENV === 'development' ? { stack: error?.stack, message } : undefined
    );
  }
}
