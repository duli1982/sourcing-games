-- Adds admin-friendly fields and tables for the dashboard tools.

-- 1) Player status (for bans)
ALTER TABLE IF EXISTS players
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2) Game overrides (content management without redeploy)
CREATE TABLE IF NOT EXISTS game_overrides (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  task TEXT,
  prompt_template TEXT,
  rubric_json JSONB,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Admin event log
CREATE TABLE IF NOT EXISTS admin_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor TEXT,
  action TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
