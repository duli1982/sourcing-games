import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertAdmin, getAdminSupabase, logAdminEvent } from '../_lib/adminUtils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!assertAdmin(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Only POST is supported.' } });
  }

  const { playerId, action } = (req.body ?? {}) as { playerId?: string; action?: 'ban' | 'unban' | 'reset-score' };
  if (!playerId || !action) {
    return res.status(400).json({ error: { code: 'bad_request', message: 'playerId and action are required.' } });
  }

  try {
    const supabase = getAdminSupabase();
    const { data: playerRow, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError || !playerRow) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Player not found.' } });
    }

    if (action === 'ban' || action === 'unban') {
      const status = action === 'ban' ? 'banned' : 'active';
      const { error: updateError } = await supabase
        .from('players')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', playerId);
      if (updateError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to update player status', details: updateError.message } });
      }
      await logAdminEvent(action, playerId, { status }, req);
      return res.status(200).json({ success: true, status });
    }

    if (action === 'reset-score') {
      const { error: resetError } = await supabase
        .from('players')
        .update({
          score: 0,
          progress: { attempts: [], achievements: [], pinHash: playerRow.progress?.pinHash || null },
          updated_at: new Date().toISOString(),
        })
        .eq('id', playerId);
      if (resetError) {
        return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to reset player', details: resetError.message } });
      }
      await logAdminEvent('reset-score', playerId, null, req);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: { code: 'unsupported_action', message: 'Unsupported action' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'unexpected_error', message: 'Failed to process player action', details: err?.message } });
  }
}
