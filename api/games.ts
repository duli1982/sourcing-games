import type { VercelRequest, VercelResponse } from '@vercel/node';
import { games as baseGames } from './_lib/data/games.js';
import { getAdminSupabase } from './_lib/adminUtils.js';
import { buildCustomGameFromOverride, isCustomOverride } from './_lib/customGames.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = getAdminSupabase();
    let overrides: any[] = [];

    try {
      const { data, error } = await supabase.from('game_overrides').select('*');
      if (error && error.code !== '42P01') {
        console.warn('game_overrides fetch error', error);
      } else {
        overrides = data || [];
      }
    } catch (err) {
      console.warn('game_overrides fetch failed', err);
    }

    const overrideMap = new Map(overrides.map(o => [o.id, o]));
    const baseGameIds = new Set(baseGames.map(game => game.id));

    const merged = baseGames
      .map(game => {
        const override = overrideMap.get(game.id);
        if (!override) return game;
        if (override.active === false) return null;
        return {
          ...game,
          title: override.title || game.title,
          description: override.description || game.description,
          task: override.task || game.task,
          // promptGenerator remains server-side for safety; UI only needs display fields
          featured: Boolean(override.featured),
        };
      })
      .filter(Boolean);

    const customGames = overrides
      .filter(override => isCustomOverride(override, baseGameIds))
      .filter(override => override.active !== false)
      .map(override => buildCustomGameFromOverride(override))
      .filter(game => Boolean(game) && !game?.isTeamGame);

    return res.status(200).json({ games: [...merged, ...customGames] });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'unexpected_error', message: 'Failed to load games', details: err?.message } });
  }
}
