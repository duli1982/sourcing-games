import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSessionTokenFromCookie } from '../_lib/utils/cookieUtils.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

/**
 * GET /api/player/me
 * Fetches the current player using the session token from httpOnly cookie
 * Security: Token is never exposed to client-side JavaScript
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read session token from httpOnly cookie
    const sessionToken = getSessionTokenFromCookie(req);

    if (!sessionToken) {
      return res.status(401).json({ error: 'No session found' });
    }

    const supabase = getSupabase();

    // Fetch player by session token
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

    // Map to Player type
    const player = {
      id: playerRow.id,
      name: playerRow.name,
      score: playerRow.score ?? 0,
      status: playerRow.status ?? 'active',
      sessionToken: playerRow.session_token,
      attempts: playerRow.progress?.attempts || [],
      achievements: playerRow.progress?.achievements || [],
      pinHash: playerRow.progress?.pinHash || undefined,
      bio: playerRow.bio,
      avatarUrl: playerRow.avatar_url,
      profileVisibility: playerRow.profile_visibility || 'public',
      socialLinks: playerRow.social_links || {},
      createdAt: playerRow.created_at,
    };

    return res.status(200).json(player);
  } catch (error) {
    console.error('Error in /api/player/me:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
