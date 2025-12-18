-- Social Features Migration: Player Profiles
-- Run this migration in Supabase SQL Editor

-- Add profile fields to players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public'
    CHECK (profile_visibility IN ('public', 'private', 'friends')),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Create index for case-insensitive name lookups (for /player/[name] routes)
CREATE INDEX IF NOT EXISTS idx_players_name_lower
  ON players(LOWER(name));

-- Note: Privacy enforcement is handled at the application level
-- See api/player/[name].ts which checks profile_visibility before returning data
-- No RLS policy needed since this app uses session token auth, not Supabase auth

-- Update existing players to have default profile visibility
UPDATE players
SET profile_visibility = 'public'
WHERE profile_visibility IS NULL;

-- Verify migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'players'
  AND column_name IN ('profile_visibility', 'bio', 'avatar_url', 'social_links');
