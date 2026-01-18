/**
 * Requests a cryptographically secure session token from the server.
 * The server sets an HttpOnly cookie which is automatically sent with all requests.
 *
 * Security: Token is returned ONLY for initial database storage when creating a player.
 * Client should NEVER store this in localStorage - only pass directly to createPlayer.
 * All subsequent API requests will automatically send the httpOnly cookie.
 */
export async function requestSessionToken(): Promise<string> {
  const response = await fetch('/api/session-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Ensure cookies are sent/received
  });

  if (!response.ok) {
    throw new Error('Failed to obtain session token');
  }

  const data = await response.json() as { sessionToken?: string };
  if (!data.sessionToken) {
    throw new Error('Session token missing in response');
  }

  // Return token ONLY for database storage - do NOT store in localStorage
  return data.sessionToken;
}
