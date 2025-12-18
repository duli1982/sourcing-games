import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchTeamDetails } from '../../services/supabaseService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamId } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid teamId' });
    }

    // Fetch team details
    const team = await fetchTeamDetails(teamId);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    return res.status(200).json(team);
  } catch (error) {
    console.error('Error in get team details endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
