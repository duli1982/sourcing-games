import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Team, TeamMember, TeamLeaderboardEntry } from '../types.js';
import { generateInviteCode } from '../utils/teamUtils.js';
import { getServiceSupabase, isMissingTableError } from './_lib/supabaseServer.js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import { computeTeamScore } from './_lib/teamScoring.js';
import type { TimeFilter } from '../types.js';
import { logger } from './_lib/logger.js';

const normalizeInviteCode = (code: string) => code.replace(/-/g, '').toUpperCase();

type TeamRow = {
  id: string;
  name: string;
  description?: string | null;
  invite_code?: string | null;
  logo_url?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  member_count?: number | null;
  max_members?: number | null;
  is_active?: boolean | null;
};

type TeamMemberRow = {
  id: string;
  team_id: string;
  player_id: string;
  player_name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
};

type PlayerRow = {
  id: string;
  score?: number | null;
  progress?: { attempts?: Array<{ ts?: string; gameId?: string; score?: number }> };
};

type TeamIdRow = { team_id: string };
type PlayerIdRow = { player_id: string };

const mapTeam = (row: TeamRow): Team => ({
  id: row.id,
  name: row.name,
  description: row.description,
  inviteCode: row.invite_code,
  logoUrl: row.logo_url,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  memberCount: row.member_count ?? 0,
  maxMembers: row.max_members ?? 50,
  isActive: row.is_active ?? true,
});

const mapTeamMember = (row: TeamMemberRow): TeamMember => ({
  id: row.id,
  teamId: row.team_id,
  playerId: row.player_id,
  playerName: row.player_name,
  role: row.role,
  joinedAt: row.joined_at,
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
 * Unified Teams API Endpoint
 * Handles all team operations to reduce serverless function count
 *
 * GET /api/teams?action=my-teams&playerId=xxx - Get user's teams
 * GET /api/teams?action=leaderboard&limit=50 - Get team leaderboard
 * GET /api/teams?action=details&teamId=xxx - Get team details
 * POST /api/teams?action=create - Create team
 * POST /api/teams?action=join - Join team with invite code
 * POST /api/teams?action=leave - Leave team
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  try {
    const supabase = getServiceSupabase();
    const timeFilter = (req.query.timeFilter as TimeFilter | undefined) || 'weekly';

    // GET operations
    if (req.method === 'GET') {
      if (action === 'my-teams') {
        const { playerId } = req.query;
        if (!playerId || typeof playerId !== 'string') {
          return res.status(400).json({ error: 'Missing or invalid playerId' });
        }

        const { data: memberRows, error: memberError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('player_id', playerId);

        if (memberError) {
          if (isMissingTableError(memberError)) return respondMissingTable(res, 'team_members');
          logger.error('Failed to fetch team memberships:', memberError);
          return res.status(500).json({ error: 'Failed to fetch teams' });
        }

        if (!memberRows || memberRows.length === 0) {
          return res.status(200).json([]);
        }

        const teamIds = (memberRows as TeamIdRow[]).map((m) => m.team_id);
        const { data: teamRows, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (teamError) {
          if (isMissingTableError(teamError)) return respondMissingTable(res, 'teams');
          logger.error('Failed to fetch player teams:', teamError);
          return res.status(500).json({ error: 'Failed to fetch teams' });
        }

        return res.status(200).json((teamRows ?? []).map(mapTeam));
      }

      if (action === 'leaderboard') {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit as string, 10) : 50;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          return res.status(400).json({ error: 'Invalid limit parameter (must be 1-100)' });
        }

        const { data: teamRows, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (teamError) {
          if (isMissingTableError(teamError)) return respondMissingTable(res, 'teams');
          logger.error('Failed to fetch teams leaderboard:', teamError);
          return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }

        const teams = (teamRows ?? []).map(mapTeam);
        const leaderboardEntries: TeamLeaderboardEntry[] = [];

        for (const team of teams) {
          const { data: memberRows, error: memberError } = await supabase
            .from('team_members')
            .select('player_id')
            .eq('team_id', team.id);

          if (memberError) {
            if (isMissingTableError(memberError)) return respondMissingTable(res, 'team_members');
            continue;
          }

          if (!memberRows || memberRows.length === 0) continue;

          const playerIds = (memberRows as PlayerIdRow[]).map((m) => m.player_id);
          const { data: playerRows, error: playerError } = await supabase
            .from('players')
            .select('id, score, progress')
            .in('id', playerIds);

          if (playerError) {
            if (isMissingTableError(playerError)) return respondMissingTable(res, 'players');
            continue;
          }

          const playerMap = new Map<string, PlayerRow>((playerRows ?? []).map((p) => [p.id, p as PlayerRow]));
          const members = playerIds.map((id: string) => ({ playerId: id }));
          const { score: teamScore } = computeTeamScore(members, playerMap, timeFilter);

          leaderboardEntries.push({
            team,
            averageScore: teamScore,
            totalMembers: memberRows.length,
            rank: 0,
          });
        }

        leaderboardEntries.sort((a, b) => b.averageScore - a.averageScore);
        leaderboardEntries.forEach((entry, index) => { entry.rank = index + 1; });

        return res.status(200).json(leaderboardEntries.slice(0, limitNum));
      }

      if (action === 'details') {
        const { teamId } = req.query;
        if (!teamId || typeof teamId !== 'string') {
          return res.status(400).json({ error: 'Missing or invalid teamId' });
        }

        const { data: teamRow, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single();

        if (teamError) {
          if (isMissingTableError(teamError)) return respondMissingTable(res, 'teams');
          return res.status(404).json({ error: 'Team not found' });
        }

        const team = mapTeam(teamRow);

        const { data: memberRows, error: memberError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .order('joined_at', { ascending: true });

        if (memberError) {
          if (isMissingTableError(memberError)) return respondMissingTable(res, 'team_members');
          return res.status(200).json(team);
        }

        const members = (memberRows ?? []).map(mapTeamMember);
        const playerIds = members.map((m) => m.playerId);

        const { data: playerRows, error: playerError } = await supabase
          .from('players')
          .select('id, score, progress')
          .in('id', playerIds);

        if (playerError) {
          if (isMissingTableError(playerError)) return respondMissingTable(res, 'players');
          return res.status(500).json({ error: 'Failed to fetch team players' });
        }

        const playerMap = new Map<string, PlayerRow>((playerRows ?? []).map((p) => [p.id, p as PlayerRow]));
        members.forEach((member) => { member.score = playerMap.get(member.playerId)?.score ?? 0; });

        const { score: teamScore } = computeTeamScore(members, playerMap, timeFilter);
        team.averageScore = teamScore;
        team.members = members;
        return res.status(200).json(team);
      }

      return res.status(400).json({ error: 'Invalid action parameter' });
    }

    // POST operations
    if (req.method === 'POST') {
      const player = await getPlayerFromSession(req, supabase);
      if (!player) return res.status(401).json({ error: 'Unauthorized - no session' });

      if (action === 'create') {
        const { name, description, logoUrl } = req.body;
        const trimmedName = typeof name === 'string' ? name.trim() : '';
        if (!trimmedName) {
          logger.error('Missing required fields:', { name });
          return res.status(400).json({ error: 'Missing required fields' });
        }
        try {
          const inviteCodePretty = generateInviteCode();
          const inviteCode = normalizeInviteCode(inviteCodePretty);

          const { data: teamRow, error: teamError } = await supabase
            .from('teams')
            .insert({
              name: trimmedName,
              description,
              logo_url: logoUrl,
              invite_code: inviteCode,
              created_by: player.name,
            })
            .select()
            .single();

          if (teamError) {
            if (isMissingTableError(teamError)) return respondMissingTable(res, 'teams');
            logger.error('Failed to create team in database:', teamError);
            return res.status(500).json({ error: 'Failed to create team' });
          }

          const { error: memberError } = await supabase
            .from('team_members')
            .insert({
              team_id: teamRow.id,
              player_id: player.id,
              player_name: player.name,
              role: 'owner',
            });

          if (memberError) {
            if (isMissingTableError(memberError)) return respondMissingTable(res, 'team_members');
            await supabase.from('teams').delete().eq('id', teamRow.id);
            logger.error('Failed to add team owner:', memberError);
            return res.status(500).json({ error: 'Failed to create team' });
          }

          // Re-fetch to get trigger-updated member_count
          const { data: freshTeamRow } = await supabase.from('teams').select('*').eq('id', teamRow.id).single();
          return res.status(201).json(mapTeam(freshTeamRow ?? teamRow));
        } catch (createError) {
          logger.error('Error creating team:', createError);
          if (isMissingTableError(createError)) return respondMissingTable(res, 'teams');
          return res.status(500).json({
            error: 'Failed to create team',
            details: createError instanceof Error ? createError.message : String(createError)
          });
        }
      }

      if (action === 'join') {
        const { inviteCode } = req.body;
        if (!inviteCode) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const normalized = normalizeInviteCode(inviteCode);
        const { data: teamRow, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('invite_code', normalized)
          .eq('is_active', true)
          .single();

        if (teamError || !teamRow) {
          if (teamError && isMissingTableError(teamError)) return respondMissingTable(res, 'teams');
          return res.status(404).json({ error: 'Invalid invite code or team not found' });
        }

        if ((teamRow.member_count ?? 0) >= (teamRow.max_members ?? 50)) {
          return res.status(400).json({ error: 'Team is full' });
        }

        const { data: existingMember, error: existingError } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamRow.id)
          .eq('player_id', player.id)
          .maybeSingle();

        if (existingError) {
          if (isMissingTableError(existingError)) return respondMissingTable(res, 'team_members');
          logger.error('Failed to check existing team membership:', existingError);
          return res.status(500).json({ error: 'Failed to join team' });
        }

        if (!existingMember) {
          const { error: memberError } = await supabase
            .from('team_members')
            .insert({
              team_id: teamRow.id,
              player_id: player.id,
              player_name: player.name,
              role: 'member',
            });

          if (memberError) {
            if (isMissingTableError(memberError)) return respondMissingTable(res, 'team_members');
            // Unique violation means they joined in another request; treat as success
            if ((memberError as { code?: string })?.code !== '23505') {
              logger.error('Failed to join team:', memberError);
              return res.status(500).json({ error: 'Failed to join team' });
            }
          }
        }

        const { data: freshTeamRow, error: freshError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamRow.id)
          .single();
        if (freshError) {
          if (isMissingTableError(freshError)) return respondMissingTable(res, 'teams');
          logger.error('Failed to fetch updated team after join:', freshError);
          return res.status(500).json({ error: 'Failed to join team' });
        }
        return res.status(200).json(mapTeam(freshTeamRow ?? teamRow));
      }

      if (action === 'leave') {
        const { teamId } = req.body;
        if (!teamId) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data: member, error: memberError } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', teamId)
          .eq('player_id', player.id)
          .maybeSingle();

        if (memberError) {
          if (isMissingTableError(memberError)) return respondMissingTable(res, 'team_members');
          return res.status(400).json({ error: 'Cannot leave team (may be owner or not a member)' });
        }

        if (!member) {
          return res.status(400).json({ error: 'Cannot leave team (may be owner or not a member)' });
        }

        if (member.role === 'owner') {
          return res.status(400).json({ error: 'Team owner cannot leave. Delete the team or transfer ownership first.' });
        }

        const { error: leaveError } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .eq('player_id', player.id);

        if (leaveError) {
          if (isMissingTableError(leaveError)) return respondMissingTable(res, 'team_members');
          return res.status(400).json({ error: 'Cannot leave team (may be owner or not a member)' });
        }
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action parameter' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    logger.error('Error in teams endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
