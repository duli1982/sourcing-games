import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_TOKEN = process.env.ADMIN_DASH_TOKEN;
const ONE_DAY = 60 * 60 * 24;

/**
 * POST /api/admin/login
 * Authenticates admin user and sets httpOnly cookie
 * Security: Admin credentials never stored in localStorage
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ADMIN_TOKEN) {
    return res.status(500).json({
      error: 'Admin authentication is not configured on the server'
    });
  }

  try {
    const { token, actor } = req.body as { token?: string; actor?: string };

    if (!token) {
      return res.status(400).json({ error: 'Admin token is required' });
    }

    // Validate admin token
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Security: Set httpOnly cookie for admin session
    const secure = process.env.VERCEL_ENV === 'production' ? 'Secure; ' : '';
    const adminActorValue = actor || 'admin';

    res.setHeader('Set-Cookie', [
      `adminToken=${token}; Path=/; ${secure}HttpOnly; SameSite=Strict; Max-Age=${ONE_DAY}`,
      `adminActor=${adminActorValue}; Path=/; SameSite=Strict; Max-Age=${ONE_DAY}`
    ]);

    return res.status(200).json({
      success: true,
      actor: adminActorValue
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
