import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import { parseCookies } from './utils/cookieUtils.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminToken = process.env.ADMIN_DASH_TOKEN;

export const getAdminSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

/**
 * Security: Read admin actor from httpOnly cookie instead of headers
 */
export const getAdminActor = (req: VercelRequest): string => {
  const cookies = parseCookies(req);
  return cookies.adminActor || 'admin';
};

/**
 * Security: Validate admin access using httpOnly cookie instead of headers
 * This prevents admin token theft via XSS attacks
 */
export const assertAdmin = (req: VercelRequest, res: VercelResponse, respond: boolean = true): boolean => {
  if (!adminToken) {
    if (respond) {
      res.status(500).json({ error: { code: 'admin_token_missing', message: 'Admin token is not configured on the server.' } });
    }
    return false;
  }

  // Read admin token from httpOnly cookie
  const cookies = parseCookies(req);
  const token = cookies.adminToken;

  const isMatch = (() => {
    if (!token) return false;
    const tokenBuf = Buffer.from(token);
    const adminBuf = Buffer.from(adminToken);
    if (tokenBuf.length !== adminBuf.length) return false;
    return timingSafeEqual(tokenBuf, adminBuf);
  })();

  if (!isMatch) {
    if (respond) {
      res.status(401).json({ error: { code: 'unauthorized', message: 'Admin access denied.' } });
    }
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
