import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import { logger } from './_lib/logger.js';
import type { PlayerStats, PublicPlayer, Achievement } from '../types.js';

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

const mapPublicPlayer = (row: any): PublicPlayer | null => {
  if (!row) return null;

  if (row.status && row.status !== 'active') {
    return null;
  }

  if (row.profile_visibility === 'private') {
    return null;
  }

  const attempts = row.progress?.attempts || [];
  const achievements = row.progress?.achievements || [];

  const totalGamesPlayed = attempts.length;
  const averageScore = totalGamesPlayed > 0
    ? Math.round(attempts.reduce((sum: number, a: any) => sum + (a.score ?? 0), 0) / totalGamesPlayed)
    : 0;
  const bestScore = totalGamesPlayed > 0
    ? Math.max(...attempts.map((a: any) => a.score ?? 0))
    : 0;

  const gameBreakdown: Record<string, { gameId: string; gameTitle: string; attempts: number; bestScore: number }> = {};
  attempts.forEach((attempt: any) => {
    if (!attempt?.gameId) return;
    if (!gameBreakdown[attempt.gameId]) {
      gameBreakdown[attempt.gameId] = {
        gameId: attempt.gameId,
        gameTitle: attempt.gameTitle || attempt.gameId,
        attempts: 0,
        bestScore: 0,
      };
    }
    gameBreakdown[attempt.gameId].attempts += 1;
    gameBreakdown[attempt.gameId].bestScore = Math.max(gameBreakdown[attempt.gameId].bestScore, attempt.score ?? 0);
  });

  const stats: PlayerStats = {
    totalGamesPlayed,
    averageScore,
    bestScore,
    totalPoints: row.score ?? 0,
    gameBreakdown: Object.values(gameBreakdown),
  };

  return {
    id: row.id,
    name: row.name,
    score: row.score ?? 0,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    socialLinks: row.social_links || {},
    achievements: (achievements || []).map((ach: any): Achievement => ({
      id: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      category: ach.category,
      unlockedAt: ach.unlockedAt,
    })),
    stats,
    createdAt: row.created_at,
  };
};

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
        logger.error('Error fetching player:', error);
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
        .select('id, name, score, status, bio, avatar_url, profile_visibility, social_links, progress, created_at')
        .ilike('name', name)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching player by name:', error);
        return res.status(500).json({ error: 'Failed to fetch player' });
      }

      if (!playerRow) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const publicPlayer = mapPublicPlayer(playerRow);
      if (!publicPlayer) {
        return res.status(404).json({ error: 'Player not found or profile is private' });
      }

      return res.status(200).json(publicPlayer);
    }

    return res.status(400).json({ error: 'Missing action or name parameter' });
  } catch (error) {
    logger.error('Error in player endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
