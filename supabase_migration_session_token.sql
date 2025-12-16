-- Migration: Add session_token column to players table
-- Run this SQL in your Supabase SQL Editor

-- Add session_token column to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS session_token TEXT UNIQUE;

-- Create index on session_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_session_token
ON players(session_token);

-- Add comment to document the column
COMMENT ON COLUMN players.session_token IS 'Persistent session token for user authentication without passwords. UUID v4 format. Stored in both localStorage and cookies for cross-device/session persistence.';
