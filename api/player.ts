import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

const mapPlayer = (row: any) => ({
  id: row.id,
  name: row.name,
  score: row.score ?? 0,
  status: row.status ?? 'active',
  sessionToken: row.session_token,
  attempts: row.progress?.attempts || [],
  achievements: row.progress?.achievements || [],
  pinHash: row.progress?.pinHash || undefined,
  bio: row.bio,
  avatarUrl: row.avatar_url,
  profileVisibility: row.profile_visibility || 'public',
  socialLinks: row.social_links || {},
  createdAt: row.created_at,
});

/**
 * Unified Player API Endpoint
 *
 * GET /api/player?action=me - Get current player via cookie
 * GET /api/player?name=PlayerName - Get public player by name
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, name } = req.query;
    const supabase = getSupabase();

    // Get current player via session cookie
    if (action === 'me') {
      const sessionToken = getSessionTokenFromCookie(req);
      if (!sessionToken) {
        return res.status(401).json({ error: 'No session found' });
      }

      const { data: playerRow, error } = await supabase
        .from('players')
        .select('*')
        .eq('session_token', sessionToken)
        .maybeSingle();

      if (error) {
        console.error('Error fetching player:', error);
        return res.status(500).json({ error: 'Failed to fetch player' });
      }

      if (!playerRow) {
        return res.status(404).json({ error: 'Player not found' });
      }

      return res.status(200).json(mapPlayer(playerRow));
    }

    // Get public player by name
    if (name && typeof name === 'string') {
      const { data: playerRow, error } = await supabase
        .from('players')
        .select('*')
        .ilike('name', name)
        .maybeSingle();

      if (error) {
        console.error('Error fetching player by name:', error);
        return res.status(500).json({ error: 'Failed to fetch player' });
      }

      if (!playerRow) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Check privacy settings
      if (playerRow.profile_visibility === 'private') {
        // Return limited public data for private profiles
        return res.status(200).json({
          name: playerRow.name,
          score: playerRow.score ?? 0,
          profileVisibility: 'private',
          createdAt: playerRow.created_at,
        });
      }

      return res.status(200).json(mapPlayer(playerRow));
    }

    return res.status(400).json({ error: 'Missing action or name parameter' });
  } catch (error) {
    console.error('Error in player endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
