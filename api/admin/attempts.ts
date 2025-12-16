import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertAdmin, getAdminSupabase } from '../_lib/adminUtils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!assertAdmin(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Only GET is supported.' } });
  }

  const { playerId, gameId, limit = '50', offset = '0' } = req.query as Record<string, string>;

  try {
    const supabase = getAdminSupabase();
    let query = supabase.from('players').select('id, name, progress');

    if (playerId) {
      query = query.eq('id', playerId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch attempts', details: error.message } });
    }

    const attempts: any[] = [];
    for (const row of data || []) {
      const playerAttempts = row.progress?.attempts || [];
      playerAttempts.forEach((attempt: any, idx: number) => {
        if (gameId && attempt.gameId !== gameId) return;
        attempts.push({
          attemptId: `${row.id}-${idx}`,
          playerId: row.id,
          playerName: row.name,
          gameId: attempt.gameId,
          gameTitle: attempt.gameTitle,
          submission: attempt.submission,
          score: attempt.score,
          ts: attempt.ts,
        });
      });
    }

    attempts.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    const start = parseInt(offset, 10) || 0;
    const end = start + (parseInt(limit, 10) || 50);

    return res.status(200).json({
      total: attempts.length,
      attempts: attempts.slice(start, end),
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'unexpected_error', message: 'Failed to load attempts', details: err?.message } });
  }
}
