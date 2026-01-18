import type { VercelRequest } from '@vercel/node';

/**
 * Parses cookies from the request headers
 * @param req - Vercel request object
 * @returns Object with cookie key-value pairs
 */
export function parseCookies(req: VercelRequest): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map(cookie => cookie.trim().split('='))
    .reduce((acc, [key, value]) => {
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {} as Record<string, string>);
}

/**
 * Extracts session token from httpOnly cookie
 * Security: Tokens are never exposed to client-side JavaScript
 * @param req - Vercel request object
 * @returns Session token or null if not found
 */
export function getSessionTokenFromCookie(req: VercelRequest): string | null {
  const cookies = parseCookies(req);
  return cookies.sessionToken || null;
}
