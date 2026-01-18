-- Initial Database Schema for Sourcing AI Games
-- Run this FIRST in Supabase SQL Editor before any other migrations

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  progress JSONB DEFAULT '{"attempts": [], "achievements": []}'::jsonb,
  session_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Profile fields (from social features migration)
  bio TEXT,
  avatar_url TEXT,
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
  social_links JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_name_lower ON players(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_players_session_token ON players(session_token);
CREATE INDEX IF NOT EXISTS idx_players_score ON players(score DESC);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);

-- Create game_overrides table (for admin)
CREATE TABLE IF NOT EXISTS game_overrides (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  prompt_template TEXT,
  featured BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_events table (for audit logging)
CREATE TABLE IF NOT EXISTS admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_events_created_at ON admin_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_events_actor ON admin_events(actor);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for players table
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON players
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for game_overrides table
DROP TRIGGER IF EXISTS update_game_overrides_updated_at ON game_overrides;
CREATE TRIGGER update_game_overrides_updated_at
BEFORE UPDATE ON game_overrides
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE players IS 'Player accounts and progress tracking';
COMMENT ON TABLE game_overrides IS 'Admin overrides for game configuration';
COMMENT ON TABLE admin_events IS 'Audit log for admin actions';

COMMENT ON COLUMN players.id IS 'Player UUID generated on account creation';
COMMENT ON COLUMN players.name IS 'Unique player display name';
COMMENT ON COLUMN players.score IS 'Total score across all games';
COMMENT ON COLUMN players.progress IS 'JSONB containing attempts array and achievements array';
COMMENT ON COLUMN players.session_token IS 'Persistent session token for authentication (UUID v4)';
COMMENT ON COLUMN players.profile_visibility IS 'Profile visibility: public or private';
COMMENT ON COLUMN players.social_links IS 'JSONB containing social media links (LinkedIn, Twitter, etc.)';

-- Verify migration
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('players', 'game_overrides', 'admin_events')
ORDER BY table_name, ordinal_position;

-- Show table counts
SELECT 'players' as table_name, COUNT(*) as row_count FROM players
UNION ALL
SELECT 'game_overrides', COUNT(*) FROM game_overrides
UNION ALL
SELECT 'admin_events', COUNT(*) FROM admin_events;
