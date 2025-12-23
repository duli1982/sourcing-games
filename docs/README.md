# AI Sourcing League Game

Modern sourcing challenges with AI feedback, Supabase persistence, and Vercel serverless functions.

## Data & Privacy

- Session tokens are stored in HttpOnly cookies and Supabase `players.session_token`.
- Returning users must provide their security PIN; PIN hashes live inside `players.progress`.
- For account deletion/GDPR requests, call `deletePlayer(name)` from `services/supabaseService.ts` or remove the row directly in Supabase (`players` table). Inform users via email or help desk.


