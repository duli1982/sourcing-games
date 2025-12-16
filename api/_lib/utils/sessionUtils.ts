/**
 * Requests a cryptographically secure session token from the server.
 * The server also sets an HttpOnly cookie for redundancy.
 */
export async function requestSessionToken(): Promise<string> {
  const response = await fetch('/api/session-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to obtain session token');
  }

  const data = await response.json() as { sessionToken?: string };
  if (!data.sessionToken) {
    throw new Error('Session token missing in response');
  }

  return data.sessionToken;
}
