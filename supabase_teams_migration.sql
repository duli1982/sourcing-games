-- Teams & Team Competition Migration
-- Run this migration in Supabase SQL Editor

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_by TEXT NOT NULL, -- Player name who created the team
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  member_count INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL, -- References players.id
  player_name TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, player_id) -- Prevent duplicate memberships
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_teams_name_lower ON teams(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_player_id ON team_members(player_id);

-- Function to update team member count
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE teams
  SET member_count = (
    SELECT COUNT(*)
    FROM team_members
    WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update member count
DROP TRIGGER IF EXISTS trigger_update_team_member_count ON team_members;
CREATE TRIGGER trigger_update_team_member_count
AFTER INSERT OR DELETE ON team_members
FOR EACH ROW
EXECUTE FUNCTION update_team_member_count();

-- Function to update team updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for team updates
DROP TRIGGER IF EXISTS trigger_update_team_timestamp ON teams;
CREATE TRIGGER trigger_update_team_timestamp
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION update_team_timestamp();

-- Add comments for documentation
COMMENT ON TABLE teams IS 'Company/Organization teams for group competitions';
COMMENT ON TABLE team_members IS 'Team membership records linking players to teams';
COMMENT ON COLUMN teams.invite_code IS '8-character alphanumeric code for joining teams';
COMMENT ON COLUMN teams.member_count IS 'Automatically updated count of team members';
COMMENT ON COLUMN team_members.role IS 'Member role: owner (creator), admin, or member';

-- Verify migration
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('teams', 'team_members')
ORDER BY table_name, ordinal_position;
