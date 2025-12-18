/**
 * GET /api/player/[name]
 * Fetches public player profile by name
 *
 * Returns PublicPlayer data if profile is public and player exists
 * Returns 404 if player not found or profile is private
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import Supabase service (we'll create a server-side version)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Extract player name from URL parameter
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Decode URL-encoded name (handles spaces and special characters)
    const decodedName = decodeURIComponent(name);

    // Fetch player from database (case-insensitive)
    const { data, error } = await supabase
      .from('players')
      .select('id, name, score, bio, avatar_url, profile_visibility, social_links, progress, created_at')
      .ilike('name', decodedName)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Player not found
        return res.status(404).json({ error: 'Player not found' });
      }
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch player' });
    }

    // Respect privacy settings
    if (data.profile_visibility === 'private') {
      return res.status(404).json({ error: 'Profile is private' });
    }

    // Extract data from progress JSONB field
    const attempts = data.progress?.attempts || [];
    const achievements = data.progress?.achievements || [];

    // Calculate player stats
    const totalGamesPlayed = attempts.length;
    const avgScore = totalGamesPlayed > 0
      ? Math.round(attempts.reduce((sum: number, a: any) => sum + a.score, 0) / totalGamesPlayed)
      : 0;
    const bestScore = totalGamesPlayed > 0
      ? Math.max(...attempts.map((a: any) => a.score))
      : 0;

    // Group attempts by game
    const gameBreakdown: { [key: string]: any } = {};
    attempts.forEach((attempt: any) => {
      if (!gameBreakdown[attempt.gameId]) {
        gameBreakdown[attempt.gameId] = {
          gameId: attempt.gameId,
          gameTitle: attempt.gameTitle,
          attempts: 0,
          bestScore: 0
        };
      }
      gameBreakdown[attempt.gameId].attempts += 1;
      gameBreakdown[attempt.gameId].bestScore = Math.max(
        gameBreakdown[attempt.gameId].bestScore,
        attempt.score
      );
    });

    // Prepare public profile data
    const publicProfile = {
      name: data.name,
      score: data.score ?? 0,
      bio: data.bio || null,
      avatarUrl: data.avatar_url || null,
      socialLinks: data.social_links || {},
      achievements: achievements.map((ach: any) => ({
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        unlockedAt: ach.unlockedAt
      })),
      stats: {
        totalGamesPlayed,
        averageScore: avgScore,
        bestScore,
        totalPoints: data.score ?? 0,
        gameBreakdown: Object.values(gameBreakdown)
      },
      createdAt: data.created_at
    };

    // Return public profile (no sensitive data)
    return res.status(200).json({ player: publicProfile });

  } catch (error) {
    console.error('Error in player profile handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
