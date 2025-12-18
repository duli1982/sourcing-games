import type { VercelRequest, VercelResponse } from '@vercel/node';
import { joinTeamWithCode } from '../../services/supabaseService';
import { isValidInviteCode } from '../../utils/teamUtils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { inviteCode, playerName, playerId } = req.body;

    // Validate required fields
    if (!inviteCode || !playerName || !playerId) {
      return res.status(400).json({ error: 'Missing required fields: inviteCode, playerName, playerId' });
    }

    // Validate invite code format
    if (!isValidInviteCode(inviteCode)) {
      return res.status(400).json({ error: 'Invalid invite code format' });
    }

    // Join team
    const team = await joinTeamWithCode(inviteCode, playerName, playerId);

    if (!team) {
      return res.status(404).json({ error: 'Team not found or invite code is invalid' });
    }

    return res.status(200).json(team);
  } catch (error: any) {
    console.error('Error in join team endpoint:', error);

    if (error.message === 'Team is full') {
      return res.status(400).json({ error: 'Team is full' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
