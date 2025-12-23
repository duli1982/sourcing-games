-- =====================================================
-- Game Discussion Threads Migration
-- =====================================================
-- This migration creates the database schema for game discussion threads
-- with commenting, voting, threading, and moderation capabilities.
--
-- Tables:
--   1. comments - Main comment data with denormalized counts
--   2. comment_votes - Vote tracking (one vote per player per comment)
--   3. comment_flags - Flag tracking for moderation
--
-- Features:
--   - Soft delete (is_deleted flag)
--   - Auto-hide at 3+ flags
--   - 1-level threading (parent + replies)
--   - Denormalized vote counts (performance)
--   - Triggers for automatic count updates
--   - RLS policies for security
-- =====================================================

-- =====================================================
-- 1. COMMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,                          -- References games (from games.json)
  player_id TEXT NOT NULL,                        -- References players.id
  player_name TEXT NOT NULL,                      -- Denormalized for performance (avoid JOINs)
  content TEXT NOT NULL,                          -- Comment text (plain text, 5-2000 chars)
  parent_id UUID,                                 -- NULL for top-level, UUID for replies
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  upvotes INTEGER NOT NULL DEFAULT 0,             -- Denormalized count from comment_votes
  downvotes INTEGER NOT NULL DEFAULT 0,           -- Denormalized count from comment_votes
  flag_count INTEGER NOT NULL DEFAULT 0,          -- Denormalized count from comment_flags
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,      -- Soft delete (shows "[deleted]")
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,       -- Auto-set to true when flag_count >= 3
  CONSTRAINT fk_parent FOREIGN KEY (parent_id)
    REFERENCES comments(id) ON DELETE CASCADE     -- Delete replies when parent deleted
);

-- Add comments for documentation
COMMENT ON TABLE comments IS 'Game discussion threads with voting and moderation';
COMMENT ON COLUMN comments.game_id IS 'References game ID from games.json';
COMMENT ON COLUMN comments.player_name IS 'Denormalized player name to avoid JOINs on list queries';
COMMENT ON COLUMN comments.parent_id IS 'NULL for top-level comments, UUID for replies (max 1 level deep)';
COMMENT ON COLUMN comments.upvotes IS 'Denormalized count updated by trigger';
COMMENT ON COLUMN comments.downvotes IS 'Denormalized count updated by trigger';
COMMENT ON COLUMN comments.flag_count IS 'Denormalized count updated by trigger';
COMMENT ON COLUMN comments.is_deleted IS 'Soft delete - comment shows as "[deleted]" but preserves thread structure';
COMMENT ON COLUMN comments.is_hidden IS 'Auto-set to true when flag_count >= 3 for moderation';

-- =====================================================
-- 2. COMMENT VOTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,                        -- References players.id
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, player_id)                   -- One vote per player per comment
);

-- Add comments for documentation
COMMENT ON TABLE comment_votes IS 'Vote tracking for comments (prevents duplicate voting)';
COMMENT ON COLUMN comment_votes.vote_type IS 'Either "up" or "down" - enforced by CHECK constraint';
COMMENT ON CONSTRAINT comment_votes_comment_id_player_id_key ON comment_votes
  IS 'Ensures one vote per player per comment (vote can be changed via UPSERT)';

-- =====================================================
-- 3. COMMENT FLAGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS comment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,                        -- References players.id
  reason TEXT,                                    -- Optional reason for flag (e.g., "Spam", "Offensive")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, player_id)                   -- One flag per player per comment
);

-- Add comments for documentation
COMMENT ON TABLE comment_flags IS 'Flag tracking for moderation (auto-hides at 3+ flags)';
COMMENT ON COLUMN comment_flags.reason IS 'Optional reason text (e.g., "Spam", "Offensive", "Off-topic")';

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for listing comments by game (most common query)
CREATE INDEX IF NOT EXISTS idx_comments_game_id
  ON comments(game_id)
  WHERE is_deleted = FALSE;

-- Index for sorting by newest
CREATE INDEX IF NOT EXISTS idx_comments_created_at
  ON comments(game_id, created_at DESC)
  WHERE is_deleted = FALSE;

-- Index for sorting by top score (upvotes - downvotes)
CREATE INDEX IF NOT EXISTS idx_comments_top_score
  ON comments(game_id, (upvotes - downvotes) DESC, created_at DESC)
  WHERE is_deleted = FALSE;

-- Index for finding replies to a parent comment
CREATE INDEX IF NOT EXISTS idx_comments_parent_id
  ON comments(parent_id)
  WHERE parent_id IS NOT NULL AND is_deleted = FALSE;

-- Index for player's comments
CREATE INDEX IF NOT EXISTS idx_comments_player_id
  ON comments(player_id, created_at DESC);

-- Index for flagged comments (admin moderation view)
CREATE INDEX IF NOT EXISTS idx_comments_flagged
  ON comments(flag_count DESC, created_at DESC)
  WHERE flag_count >= 3;

-- Index for vote lookups
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id
  ON comment_votes(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_votes_player_id
  ON comment_votes(player_id);

-- Index for flag lookups
CREATE INDEX IF NOT EXISTS idx_comment_flags_comment_id
  ON comment_flags(comment_id);

-- =====================================================
-- 5. TRIGGERS FOR AUTOMATIC COUNT UPDATES
-- =====================================================

-- -----------------------------------------------
-- Trigger Function: Update vote counts
-- -----------------------------------------------
-- Automatically updates upvotes/downvotes counts in comments table
-- when votes are inserted, updated, or deleted.
-- -----------------------------------------------

CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_comment_id UUID;
BEGIN
  -- Get the comment_id being affected
  target_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);

  -- Update denormalized counts in comments table
  UPDATE comments
  SET
    upvotes = (
      SELECT COUNT(*)
      FROM comment_votes
      WHERE comment_id = target_comment_id AND vote_type = 'up'
    ),
    downvotes = (
      SELECT COUNT(*)
      FROM comment_votes
      WHERE comment_id = target_comment_id AND vote_type = 'down'
    ),
    updated_at = NOW()
  WHERE id = target_comment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_comment_vote_counts ON comment_votes;

-- Create trigger on comment_votes table
CREATE TRIGGER trigger_update_comment_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON comment_votes
FOR EACH ROW
EXECUTE FUNCTION update_comment_vote_counts();

COMMENT ON FUNCTION update_comment_vote_counts() IS 'Automatically updates upvotes/downvotes in comments table when votes change';

-- -----------------------------------------------
-- Trigger Function: Update flag count and auto-hide
-- -----------------------------------------------
-- Automatically updates flag_count in comments table
-- and sets is_hidden=true when flag_count >= 3.
-- -----------------------------------------------

CREATE OR REPLACE FUNCTION update_comment_flag_count()
RETURNS TRIGGER AS $$
DECLARE
  target_comment_id UUID;
  new_flag_count INTEGER;
BEGIN
  -- Get the comment_id being affected
  target_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);

  -- Count current flags
  SELECT COUNT(*) INTO new_flag_count
  FROM comment_flags
  WHERE comment_id = target_comment_id;

  -- Update denormalized count and auto-hide if >= 3 flags
  UPDATE comments
  SET
    flag_count = new_flag_count,
    is_hidden = (new_flag_count >= 3),
    updated_at = NOW()
  WHERE id = target_comment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_comment_flag_count ON comment_flags;

-- Create trigger on comment_flags table
CREATE TRIGGER trigger_update_comment_flag_count
AFTER INSERT OR DELETE ON comment_flags
FOR EACH ROW
EXECUTE FUNCTION update_comment_flag_count();

COMMENT ON FUNCTION update_comment_flag_count() IS 'Automatically updates flag_count and is_hidden in comments table when flags change';

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_flags ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- COMMENTS TABLE POLICIES
-- -----------------------------------------------

-- Public READ: Anyone can view non-deleted comments
CREATE POLICY "comments_public_read"
ON comments FOR SELECT
TO public
USING (is_deleted = FALSE);

-- Authenticated INSERT: Any authenticated user can create comments
CREATE POLICY "comments_insert"
ON comments FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Owner UPDATE: Users can only update their own comments
CREATE POLICY "comments_update_owner"
ON comments FOR UPDATE
TO authenticated
USING (player_id = current_user)
WITH CHECK (player_id = current_user);

-- Owner DELETE: Users can only delete their own comments
-- Note: API will use soft delete (is_deleted=true) instead of actual DELETE
CREATE POLICY "comments_delete_owner"
ON comments FOR DELETE
TO authenticated
USING (player_id = current_user);

-- -----------------------------------------------
-- COMMENT VOTES TABLE POLICIES
-- -----------------------------------------------

-- Public READ: Anyone can see vote data (for aggregation)
CREATE POLICY "comment_votes_public_read"
ON comment_votes FOR SELECT
TO public
USING (TRUE);

-- Authenticated INSERT: Any authenticated user can vote
CREATE POLICY "comment_votes_insert"
ON comment_votes FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Owner UPDATE: Users can only update their own votes
CREATE POLICY "comment_votes_update_owner"
ON comment_votes FOR UPDATE
TO authenticated
USING (player_id = current_user)
WITH CHECK (player_id = current_user);

-- Owner DELETE: Users can only delete their own votes
CREATE POLICY "comment_votes_delete_owner"
ON comment_votes FOR DELETE
TO authenticated
USING (player_id = current_user);

-- -----------------------------------------------
-- COMMENT FLAGS TABLE POLICIES
-- -----------------------------------------------

-- Public READ: Anyone can see flags (for flag count display)
CREATE POLICY "comment_flags_public_read"
ON comment_flags FOR SELECT
TO public
USING (TRUE);

-- Authenticated INSERT: Any authenticated user can flag comments
CREATE POLICY "comment_flags_insert"
ON comment_flags FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Owner DELETE: Users can remove their own flags
CREATE POLICY "comment_flags_delete_owner"
ON comment_flags FOR DELETE
TO authenticated
USING (player_id = current_user);

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Run these queries after migration to verify setup:

-- Verify tables created
-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('comments', 'comment_votes', 'comment_flags');

-- Verify indexes created
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN ('comments', 'comment_votes', 'comment_flags');

-- Verify triggers created
-- SELECT trigger_name, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND event_object_table IN ('comment_votes', 'comment_flags');

-- Verify RLS policies created
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('comments', 'comment_votes', 'comment_flags');

-- =====================================================
-- 8. ADMIN NOTES
-- =====================================================

-- To run this migration:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and click "Run"
-- 4. Verify success with verification queries above
--
-- To rollback (DANGER - deletes all comment data):
-- DROP TABLE IF EXISTS comment_flags CASCADE;
-- DROP TABLE IF EXISTS comment_votes CASCADE;
-- DROP TABLE IF EXISTS comments CASCADE;
-- DROP FUNCTION IF EXISTS update_comment_vote_counts() CASCADE;
-- DROP FUNCTION IF EXISTS update_comment_flag_count() CASCADE;
--
-- Performance considerations:
-- - Denormalized counts avoid COUNT(*) queries on every list
-- - Indexes optimized for common queries (game_id, sorting)
-- - Soft delete preserves thread structure
-- - RLS policies enforced at database level for security
--
-- Security considerations:
-- - API uses service role key to bypass RLS for admin operations
-- - Content sanitization happens in API layer before insert
-- - Rate limiting enforced in API layer (1 comment per 10s)
-- - Auto-hide at 3+ flags reduces moderation burden
--
-- =====================================================
-- END OF MIGRATION
-- =====================================================
