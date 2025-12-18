import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchPlayerTeams } from '../../services/supabaseService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid playerId' });
    }

    // Fetch player's teams
    const teams = await fetchPlayerTeams(playerId);

    return res.status(200).json(teams);
  } catch (error) {
    console.error('Error in my teams endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
