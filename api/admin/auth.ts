import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_TOKEN = process.env.ADMIN_DASH_TOKEN;
const ONE_DAY = 60 * 60 * 24;

/**
 * Unified Admin Authentication Endpoint
 *
 * POST /api/admin/auth?action=login - Login
 * POST /api/admin/auth?action=logout - Logout
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;

  try {
    // Login
    if (action === 'login') {
      if (!ADMIN_TOKEN) {
        return res.status(500).json({ error: 'Admin authentication is not configured on the server' });
      }

      const { token, actor } = req.body as { token?: string; actor?: string };

      if (!token) {
        return res.status(400).json({ error: 'Admin token is required' });
      }

      if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      const secure = process.env.VERCEL_ENV === 'production' ? 'Secure; ' : '';
      const adminActorValue = actor || 'admin';

      res.setHeader('Set-Cookie', [
        `adminToken=${token}; Path=/; ${secure}HttpOnly; SameSite=Strict; Max-Age=${ONE_DAY}`,
        `adminActor=${adminActorValue}; Path=/; SameSite=Strict; Max-Age=${ONE_DAY}`
      ]);

      return res.status(200).json({ success: true, actor: adminActorValue });
    }

    // Logout
    if (action === 'logout') {
      res.setHeader('Set-Cookie', [
        'adminToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
        'adminActor=; Path=/; SameSite=Strict; Max-Age=0'
      ]);

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
