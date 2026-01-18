const GEMINI_COOLDOWN_MS = 30_000;
const GEMINI_PROMPT_CHAR_LIMIT = 2800;
let lastCallTimestamp = 0;

/**
 * Calls the server-side Gemini proxy with a specific prompt.
 * @param prompt The text prompt to send to the model.
 * @returns The text response from the model.
 */
export const getGeminiResponse = async (prompt: string): Promise<string> => {
  try {
    const now = Date.now();
    if (now - lastCallTimestamp < GEMINI_COOLDOWN_MS) {
      return 'Please take a short breather before asking the AI coach again.';
    }

    const trimmedPrompt = prompt.trim().slice(0, GEMINI_PROMPT_CHAR_LIMIT);
    if (!trimmedPrompt) {
      return 'I need a bit more context to help you.';
    }

    lastCallTimestamp = now;

    const resp = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: trimmedPrompt }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const message = (err && err.error) ? String(err.error) : `Request failed with ${resp.status}`;
      throw new Error(message);
    }

    const data = (await resp.json()) as { text?: string };
    return data.text || 'No response received.';
  } catch (error) {
    console.error('Gemini API call failed:', error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return 'Sorry, there was an error getting feedback. Please try again later.';
  }
};
