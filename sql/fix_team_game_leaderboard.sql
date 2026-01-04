-- Fix for get_team_game_leaderboard function
-- This replaces the overly complex version with a simpler, more robust implementation
-- Run this in your Supabase SQL Editor to fix the 500 error

CREATE OR REPLACE FUNCTION get_team_game_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  total_score INTEGER,
  games_played INTEGER,
  rank INTEGER
)
LANGUAGE sql
AS $$
WITH team_best_scores AS (
  -- Get best score for each team-game combination
  SELECT
    ta.team_id,
    ta.game_id,
    MAX(ta.score) as best_score
  FROM team_attempts ta
  GROUP BY ta.team_id, ta.game_id
),
team_totals AS (
  -- Sum up best scores per team and count games played
  SELECT
    t.id as team_id,
    t.name as team_name,
    COALESCE(SUM(tbs.best_score), 0)::INTEGER as total_score,
    COUNT(tbs.game_id)::INTEGER as games_played
  FROM teams t
  LEFT JOIN team_best_scores tbs ON t.id = tbs.team_id
  WHERE t.is_active = TRUE
  GROUP BY t.id, t.name
)
SELECT
  tt.team_id,
  tt.team_name,
  tt.total_score,
  tt.games_played,
  ROW_NUMBER() OVER (ORDER BY tt.total_score DESC, tt.games_played DESC)::INTEGER as rank
FROM team_totals tt
ORDER BY rank
LIMIT p_limit;
$$;

-- Test the function
SELECT 'Function updated successfully!' as status;
SELECT * FROM get_team_game_leaderboard(10);
