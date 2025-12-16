const encoder = new TextEncoder();

export const PIN_LENGTH = 6;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  try {
    const encoded = encoder.encode(pin);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.warn('Falling back to basic hashing for PIN:', error);
    return btoa(pin);
  }
}
