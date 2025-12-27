import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { TeamAttempt } from '../types.js';
import { getServiceSupabase, isMissingTableError } from './_lib/supabaseServer.js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';

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
          console.error('Failed to fetch team game leaderboard:', leaderboardError);
          return res.status(500).json({ error: 'Failed to fetch leaderboard' });
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
        const { teamId, teamName, gameId, gameTitle, submission, score, skill, feedback } = req.body;

        if (!teamId || !teamName || !gameId || !gameTitle || !submission || score === undefined) {
          return res.status(400).json({ error: 'Missing required fields' });
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

        // Insert the team attempt
        const { data: attemptRow, error: attemptError } = await supabase
          .from('team_attempts')
          .insert({
            team_id: teamId,
            team_name: teamName,
            game_id: gameId,
            game_title: gameTitle,
            submission: submission,
            score: score,
            skill: skill,
            submitted_by: player.id,
            submitted_by_name: player.name,
            feedback: feedback,
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
