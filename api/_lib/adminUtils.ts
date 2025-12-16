import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminToken = process.env.ADMIN_DASH_TOKEN;

export const getAdminSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

export const getAdminActor = (req: VercelRequest): string =>
  (req.headers['x-admin-actor'] as string) ||
  (req.headers['x-admin-user'] as string) ||
  'admin';

export const assertAdmin = (req: VercelRequest, res: VercelResponse): boolean => {
  if (!adminToken) {
    res.status(500).json({ error: { code: 'admin_token_missing', message: 'Admin token is not configured on the server.' } });
    return false;
  }
  const token = (req.headers['x-admin-token'] || req.headers['authorization'] || '').toString().replace('Bearer ', '');
  if (!token || token !== adminToken) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Admin access denied.' } });
    return false;
  }
  return true;
};

export const logAdminEvent = async (
  action: string,
  targetId: string | null,
  details: Record<string, unknown> | null,
  req: VercelRequest
) => {
  try {
    const supabase = getAdminSupabase();
    await supabase.from('admin_events').insert({
      actor: getAdminActor(req),
      action,
      target_id: targetId,
      details,
    });
  } catch (err) {
    console.warn('Failed to log admin event', err);
  }
};
