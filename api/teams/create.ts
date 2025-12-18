import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createTeam } from '../../services/supabaseService';
import { isValidTeamName } from '../../utils/teamUtils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, description, logoUrl, playerName, playerId } = req.body;

    // Validate required fields
    if (!name || !playerName || !playerId) {
      return res.status(400).json({ error: 'Missing required fields: name, playerName, playerId' });
    }

    // Validate team name
    const nameValidation = isValidTeamName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }

    // Create team
    const team = await createTeam(
      { name, description, logoUrl },
      playerName,
      playerId
    );

    if (!team) {
      return res.status(500).json({ error: 'Failed to create team' });
    }

    return res.status(201).json(team);
  } catch (error) {
    console.error('Error in create team endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
