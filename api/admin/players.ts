import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertAdmin, getAdminSupabase } from '../_lib/adminUtils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!assertAdmin(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Only GET is supported.' } });
  }

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('players')
      .select('id, name, score, status, session_token, progress, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to fetch players', details: error.message } });
    }

    const players = (data || []).map((row: any) => {
      const attempts = row.progress?.attempts || [];
      const lastAttemptAt = attempts.length ? attempts[attempts.length - 1].ts : null;
      return {
        id: row.id,
        name: row.name,
        score: row.score ?? 0,
        status: row.status ?? 'active',
        totalAttempts: attempts.length,
        lastAttemptAt,
      };
    });

    return res.status(200).json({ players });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'unexpected_error', message: 'Failed to load players', details: err?.message } });
  }
}
