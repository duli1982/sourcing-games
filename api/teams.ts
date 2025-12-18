import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createTeam, joinTeamWithCode, leaveTeam, fetchTeamDetails, fetchPlayerTeams, fetchTeamLeaderboard } from '../services/supabaseService';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils';

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
    // GET operations
    if (req.method === 'GET') {
      if (action === 'my-teams') {
        const { playerId } = req.query;
        if (!playerId || typeof playerId !== 'string') {
          return res.status(400).json({ error: 'Missing or invalid playerId' });
        }
        const teams = await fetchPlayerTeams(playerId);
        return res.status(200).json(teams);
      }

      if (action === 'leaderboard') {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit as string, 10) : 50;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          return res.status(400).json({ error: 'Invalid limit parameter (must be 1-100)' });
        }
        const leaderboard = await fetchTeamLeaderboard(limitNum);
        return res.status(200).json(leaderboard);
      }

      if (action === 'details') {
        const { teamId } = req.query;
        if (!teamId || typeof teamId !== 'string') {
          return res.status(400).json({ error: 'Missing or invalid teamId' });
        }
        const team = await fetchTeamDetails(teamId);
        if (!team) {
          return res.status(404).json({ error: 'Team not found' });
        }
        return res.status(200).json(team);
      }

      return res.status(400).json({ error: 'Invalid action parameter' });
    }

    // POST operations
    if (req.method === 'POST') {
      // Get session token from cookie
      const sessionToken = getSessionTokenFromCookie(req);
      if (!sessionToken) {
        return res.status(401).json({ error: 'Unauthorized - no session' });
      }

      if (action === 'create') {
        const { name, description, playerName, playerId } = req.body;
        if (!name || !playerName || !playerId) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        const team = await createTeam({ name, description }, playerName, playerId);
        if (!team) {
          return res.status(500).json({ error: 'Failed to create team' });
        }
        return res.status(201).json(team);
      }

      if (action === 'join') {
        const { inviteCode, playerName, playerId } = req.body;
        if (!inviteCode || !playerName || !playerId) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        const team = await joinTeamWithCode(inviteCode, playerName, playerId);
        if (!team) {
          return res.status(404).json({ error: 'Invalid invite code or team not found' });
        }
        return res.status(200).json(team);
      }

      if (action === 'leave') {
        const { teamId, playerId } = req.body;
        if (!teamId || !playerId) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        const success = await leaveTeam(teamId, playerId);
        if (!success) {
          return res.status(400).json({ error: 'Cannot leave team (may be owner or not a member)' });
        }
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action parameter' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in teams endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
