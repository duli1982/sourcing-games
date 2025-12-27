-- Team Games & Team Attempts Migration
-- Run this migration in Supabase SQL Editor
-- This adds support for team-based game submissions

-- Create team_attempts table (similar to individual attempts but for teams)
CREATE TABLE IF NOT EXISTS team_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,
  submission TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  skill TEXT, -- Skill category (multiplatform, boolean, outreach, etc.)
  submitted_by TEXT NOT NULL, -- Player ID who submitted on behalf of team
  submitted_by_name TEXT NOT NULL, -- Player name who submitted
  ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_attempts_team_id ON team_attempts(team_id);
CREATE INDEX IF NOT EXISTS idx_team_attempts_game_id ON team_attempts(game_id);
CREATE INDEX IF NOT EXISTS idx_team_attempts_submitted_by ON team_attempts(submitted_by);
CREATE INDEX IF NOT EXISTS idx_team_attempts_ts ON team_attempts(ts DESC);
CREATE INDEX IF NOT EXISTS idx_team_attempts_skill ON team_attempts(skill);

-- Composite index for team + game lookups (find team's best score for a game)
CREATE INDEX IF NOT EXISTS idx_team_attempts_team_game ON team_attempts(team_id, game_id, score DESC);

-- Function to get team's best score for a specific game
CREATE OR REPLACE FUNCTION get_team_best_score(p_team_id UUID, p_game_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(MAX(score), 0)
    FROM team_attempts
    WHERE team_id = p_team_id AND game_id = p_game_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total team game score (sum of best scores per game)
CREATE OR REPLACE FUNCTION calculate_team_game_score(p_team_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(best_score), 0)
    FROM (
      SELECT game_id, MAX(score) as best_score
      FROM team_attempts
      WHERE team_id = p_team_id
      GROUP BY game_id
    ) AS game_scores
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get team's recent attempts (last N attempts)
CREATE OR REPLACE FUNCTION get_team_recent_attempts(p_team_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  game_id TEXT,
  game_title TEXT,
  score INTEGER,
  skill TEXT,
  submitted_by_name TEXT,
  ts TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ta.id,
    ta.game_id,
    ta.game_title,
    ta.score,
    ta.skill,
    ta.submitted_by_name,
    ta.ts
  FROM team_attempts ta
  WHERE ta.team_id = p_team_id
  ORDER BY ta.ts DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get team game leaderboard (top teams by total team game score)
CREATE OR REPLACE FUNCTION get_team_game_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  total_score INTEGER,
  games_played INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH team_scores AS (
    SELECT
      t.id as team_id,
      t.name as team_name,
      COALESCE(SUM(
        (SELECT MAX(score)
         FROM team_attempts ta
         WHERE ta.team_id = t.id AND ta.game_id = game_scores.game_id)
      ), 0) as total_score,
      COUNT(DISTINCT game_scores.game_id) as games_played
    FROM teams t
    LEFT JOIN (
      SELECT DISTINCT team_id, game_id
      FROM team_attempts
    ) game_scores ON t.id = game_scores.team_id
    WHERE t.is_active = TRUE
    GROUP BY t.id, t.name
  )
  SELECT
    ts.team_id,
    ts.team_name,
    ts.total_score::INTEGER,
    ts.games_played::INTEGER,
    ROW_NUMBER() OVER (ORDER BY ts.total_score DESC, ts.games_played DESC)::INTEGER as rank
  FROM team_scores ts
  ORDER BY rank
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add RLS (Row Level Security) policies
ALTER TABLE team_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view team attempts
CREATE POLICY "Anyone can view team attempts"
ON team_attempts FOR SELECT
USING (TRUE);

-- Policy: Team members can insert attempts for their team
CREATE POLICY "Team members can insert attempts"
ON team_attempts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = team_attempts.team_id
    AND team_members.player_id = team_attempts.submitted_by
  )
);

-- Policy: Only the submitter can update/delete their team's attempts
CREATE POLICY "Submitter can update team attempts"
ON team_attempts FOR UPDATE
USING (submitted_by = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Submitter can delete team attempts"
ON team_attempts FOR DELETE
USING (submitted_by = current_setting('app.current_user_id', TRUE));

-- Add comments for documentation
COMMENT ON TABLE team_attempts IS 'Team game submissions - one submission per team per game';
COMMENT ON COLUMN team_attempts.team_id IS 'Foreign key to teams table';
COMMENT ON COLUMN team_attempts.game_id IS 'Game identifier (e.g., team-github-1)';
COMMENT ON COLUMN team_attempts.score IS 'Validated score between 0-100';
COMMENT ON COLUMN team_attempts.skill IS 'Skill category (multiplatform, boolean, outreach, etc.)';
COMMENT ON COLUMN team_attempts.submitted_by IS 'Player ID who submitted on behalf of the team';
COMMENT ON COLUMN team_attempts.ts IS 'Timestamp of submission';

-- Verify migration
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'team_attempts'
ORDER BY ordinal_position;

-- Test functions
SELECT 'Migration complete! Test the functions:' as status;
SELECT 'Example: SELECT * FROM get_team_game_leaderboard(10);' as example_query;
