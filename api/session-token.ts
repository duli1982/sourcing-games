import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID, randomBytes } from 'crypto';

const ONE_YEAR = 60 * 60 * 24 * 365;

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionToken = typeof randomUUID === 'function'
    ? randomUUID()
    : randomBytes(32).toString('hex');

  const secure = process.env.VERCEL_ENV === 'production' ? 'Secure; ' : '';
  res.setHeader('Set-Cookie', `sessionToken=${sessionToken}; Path=/; ${secure}HttpOnly; SameSite=Strict; Max-Age=${ONE_YEAR}`);

  // Security: Return token ONLY for initial database storage
  // Client should NEVER store this in localStorage - only pass to createPlayer
  // All subsequent requests will use the httpOnly cookie
  return res.status(200).json({ sessionToken });
}
