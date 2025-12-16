import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertAdmin, getAdminSupabase, logAdminEvent } from '../_lib/adminUtils.js';

/**
 * This endpoint manages game overrides (featured/active/prompt/rubric) stored in Supabase table `game_overrides`.
 * If the table is missing, it returns 503 with setup guidance.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!assertAdmin(req, res)) return;

  const supabase = getAdminSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('game_overrides').select('*');
    if (error?.code === '42P01') {
      return res.status(503).json({ error: { code: 'table_missing', message: 'game_overrides table not found. Run supabase_admin_setup.sql.' } });
    }
    if (error) {
      return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to load overrides', details: error.message } });
    }
    return res.status(200).json({ overrides: data || [] });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = req.body as any;
    if (!body?.id) {
      return res.status(400).json({ error: { code: 'bad_request', message: 'id is required' } });
    }
    const payload = {
      id: body.id,
      title: body.title,
      description: body.description,
      task: body.task,
      prompt_template: body.prompt_template,
      rubric_json: body.rubric_json,
      featured: Boolean(body.featured),
      active: body.active !== false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('game_overrides').upsert(payload, { onConflict: 'id' });
    if (error?.code === '42P01') {
      return res.status(503).json({ error: { code: 'table_missing', message: 'game_overrides table not found. Run supabase_admin_setup.sql.' } });
    }
    if (error) {
      return res.status(500).json({ error: { code: 'supabase_error', message: 'Failed to save override', details: error.message } });
    }
    await logAdminEvent('save-game-override', payload.id, payload, req);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Only GET/POST/PUT supported.' } });
}
