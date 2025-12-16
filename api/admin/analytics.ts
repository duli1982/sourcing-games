import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertAdmin, getAdminSupabase } from '../_lib/adminUtils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!assertAdmin(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Only GET is supported.' } });
  }

  try {
    const supabase = getAdminSupabase();
    const { data: players, error } = await supabase.from('players').select('id, name, score, status, progress, updated_at, created_at');
    if (error) {
      return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch players', details: error.message } });
    }

    const now = Date.now();
    const daysAgo = (days: number) => now - days * 24 * 60 * 60 * 1000;
    const stats = {
      totalPlayers: players?.length || 0,
      active7d: 0,
      active30d: 0,
      attempts7d: 0,
      attempts30d: 0,
      repeatPlayers: 0,
      churned14d: 0,
      gameStats: {} as Record<string, { gameId: string; gameTitle: string; attempts: number; avgScore: number }>,
    };

    for (const player of players || []) {
      const attempts = player.progress?.attempts || [];
      if (attempts.length >= 2) stats.repeatPlayers += 1;
      const lastAttempt = attempts.length ? new Date(attempts[attempts.length - 1].ts).getTime() : null;
      if (lastAttempt && lastAttempt < daysAgo(14)) stats.churned14d += 1;

      let attempts7d = 0;
      let attempts30d = 0;
      attempts.forEach((a: any) => {
        const ts = new Date(a.ts).getTime();
        if (ts >= daysAgo(7)) {
          attempts7d += 1;
          stats.attempts7d += 1;
        }
        if (ts >= daysAgo(30)) {
          attempts30d += 1;
          stats.attempts30d += 1;
        }

        const gameId = a.gameId || 'unknown';
        const entry = stats.gameStats[gameId] || { gameId, gameTitle: a.gameTitle || gameId, attempts: 0, avgScore: 0 };
        entry.attempts += 1;
        entry.avgScore = entry.avgScore + (a.score - entry.avgScore) / entry.attempts;
        stats.gameStats[gameId] = entry;
      });

      if (attempts7d > 0) stats.active7d += 1;
      if (attempts30d > 0) stats.active30d += 1;
    }

    const gameList = Object.values(stats.gameStats).sort((a, b) => b.attempts - a.attempts);

    return res.status(200).json({
      totalPlayers: stats.totalPlayers,
      active7d: stats.active7d,
      active30d: stats.active30d,
      attempts7d: stats.attempts7d,
      attempts30d: stats.attempts30d,
      repeatPlayers: stats.repeatPlayers,
      churned14d: stats.churned14d,
      gameStats: gameList,
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'unexpected_error', message: 'Failed to build analytics', details: err?.message } });
  }
}
