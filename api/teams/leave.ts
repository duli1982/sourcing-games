import type { VercelRequest, VercelResponse } from '@vercel/node';
import { leaveTeam } from '../../services/supabaseService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamId, playerId } = req.body;

    // Validate required fields
    if (!teamId || !playerId) {
      return res.status(400).json({ error: 'Missing required fields: teamId, playerId' });
    }

    // Leave team
    const success = await leaveTeam(teamId, playerId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to leave team or not a member' });
    }

    return res.status(200).json({ success: true, message: 'Successfully left team' });
  } catch (error: any) {
    console.error('Error in leave team endpoint:', error);

    if (error.message.includes('owner cannot leave')) {
      return res.status(403).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
