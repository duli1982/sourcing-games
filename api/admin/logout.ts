import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/admin/logout
 * Clears admin httpOnly cookies
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear admin cookies by setting Max-Age=0
  res.setHeader('Set-Cookie', [
    'adminToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    'adminActor=; Path=/; SameSite=Strict; Max-Age=0'
  ]);

  return res.status(200).json({ success: true });
}
