import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_MAX_OUTPUT_TOKENS = 800;
const GEMINI_PROMPT_CHAR_LIMIT = 2800;
const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_SECOND_FALLBACK_MODEL = 'gemini-3-flash';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = (req.body ?? {}) as { prompt?: string };
    const trimmedPrompt = (prompt ?? '').trim().slice(0, GEMINI_PROMPT_CHAR_LIMIT);
    if (!trimmedPrompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const models = [GEMINI_PRIMARY_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_SECOND_FALLBACK_MODEL];
    let responseText: string | undefined;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: trimmedPrompt }] }],
          config: {
            temperature: 0.35,
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
            candidateCount: 1,
          },
        } as any);

        responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) break;
        console.warn(`Gemini model ${model} returned empty response`);
      } catch (modelError) {
        console.warn(`Gemini model ${model} failed:`, modelError);
      }
    }

    if (!responseText) {
      return res.status(500).json({ error: 'Gemini did not return a response' });
    }

    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    console.error('Gemini API proxy error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    const message = error?.message || 'Unknown error';
    if (typeof message === 'string' && message.includes('API key not valid')) {
      return res.status(401).json({ error: 'Invalid Gemini API key' });
    }
    return res.status(500).json({
      error: 'Failed to fetch AI coach response',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
