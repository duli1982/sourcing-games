import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSessionTokenFromCookie } from './_lib/utils/cookieUtils.js';
import { games } from './_lib/data/games.js';
import { getGameRecommendations } from './_lib/adaptiveDifficulty.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

const parseLimit = (limit?: string | string[]) => {
  if (!limit) return 5;
  const raw = Array.isArray(limit) ? limit[0] : limit;
  const value = parseInt(raw, 10);
  if (Number.isNaN(value) || value < 1) return 5;
  return Math.min(10, value);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionToken = getSessionTokenFromCookie(req);
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session found' });
    }

    const supabase = getSupabase();
    const { data: playerRow, error } = await supabase
      .from('players')
      .select('id')
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (error) {
      console.error('Error fetching player:', error);
      return res.status(500).json({ error: 'Failed to fetch player' });
    }
    if (!playerRow) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const limit = parseLimit(req.query.limit);
    const availableGames = (games || []).filter(g => !g.isTeamGame);
    const recommendations = await getGameRecommendations(supabase, playerRow.id, availableGames, {
      limit,
    });

    return res.status(200).json({
      recommendations: recommendations.map(rec => ({
        gameId: rec.game.id,
        title: rec.game.title,
        description: rec.game.description,
        skillCategory: rec.game.skillCategory,
        difficulty: rec.game.difficulty,
        recommendationType: rec.recommendationType,
        recommendationReason: rec.recommendationReason,
        predictedScoreRange: rec.predictedScoreRange,
        difficultyMatch: rec.difficultyMatch,
        confidence: rec.confidence,
        priority: rec.priority,
      })),
    });
  } catch (error) {
    console.error('Error in recommendations endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
