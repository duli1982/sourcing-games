import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchTeamLeaderboard } from '../../services/supabaseService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit as string, 10) : 50;

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter (must be 1-100)' });
    }

    // Fetch team leaderboard
    const leaderboard = await fetchTeamLeaderboard(limitNum);

    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error in team leaderboard endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
