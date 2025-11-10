import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_MAX_OUTPUT_TOKENS = 120;
const GEMINI_PROMPT_CHAR_LIMIT = 2800;

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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: trimmedPrompt,
      temperature: 0.35,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      candidateCount: 1,
    });

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini API proxy error:', error);
    const message = error?.message || 'Unknown error';
    if (typeof message === 'string' && message.includes('API key not valid')) {
      return res.status(401).json({ error: 'Invalid Gemini API key' });
    }
    return res.status(500).json({ error: 'Failed to fetch AI coach response' });
  }
}
