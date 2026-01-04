import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { TeamAttempt } from '../types.js';
import { getServiceSupabase, isMissingTableError } from './_lib/supabaseServer.js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import { computeServerValidation } from './_lib/computeValidation.js';

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
          console.error('Failed to fetch team attempts:', attemptError);
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
          console.error('Team leaderboard RPC failed, using fallback:', leaderboardError);

          try {
            const fallback = await computeLeaderboardFallback(supabase, limitNum);
            return res.status(200).json(fallback);
          } catch (fallbackError) {
            console.error('Team leaderboard fallback failed:', fallbackError);
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
        const { teamId, teamName, gameId, gameTitle, submission, skill } = req.body;

        if (!teamId || !teamName || !gameId || !gameTitle || !submission) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        let teamGames: any[] | null = null;
        try {
          const mod = await import('../data/teamGames.js');
          teamGames = (mod as any).teamGames || null;
        } catch (err) {
          console.error('Failed to load teamGames data for validation:', err);
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
          console.error('Failed to check existing team attempt:', checkError);
          return res.status(500).json({ error: 'Failed to verify submission status' });
        }

        if (existingTeamAttempt) {
          return res.status(409).json({
            error: 'Your team has already submitted for this game. Only one submission per team per game is allowed.'
          });
        }

        const validation = computeServerValidation(game, submission);
        const computedScore = validation.score;
        const computedFeedback = JSON.stringify({
          feedback: validation.feedback,
          strengths: validation.strengths,
          checks: validation.checks ?? {},
          serverValidated: true,
          computedAt: new Date().toISOString(),
        });

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
          console.error('Failed to insert team attempt:', attemptError);
          return res.status(500).json({ error: 'Failed to submit team game attempt' });
        }

        return res.status(201).json(mapTeamAttempt(attemptRow));
      }

      return res.status(400).json({ error: 'Invalid action parameter' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in team-games endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
