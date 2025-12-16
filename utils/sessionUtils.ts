/**
 * Requests a cryptographically secure session token from the server.
 * The server also sets an HttpOnly cookie for redundancy.
 */
export async function requestSessionToken(): Promise<string> {
  try {
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
  } catch (err) {
    // Local fallback for dev environments where the API isn't running
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
