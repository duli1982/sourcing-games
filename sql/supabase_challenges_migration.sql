-- ==========================================
-- CHALLENGES TABLE MIGRATION
-- ==========================================
-- Purpose: Enable player-to-player challenges for specific games
-- Created: December 18, 2025
-- Dependencies: players table
-- ==========================================

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Challenge participants
    challenger_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    challenged_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

    -- Game details
    game_id TEXT NOT NULL,
    game_title TEXT NOT NULL,

    -- Challenge status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'expired')),

    -- Scores
    challenger_score INTEGER,
    challenged_score INTEGER,
    winner_id UUID REFERENCES players(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Optional message from challenger
    message TEXT,

    -- Metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_game ON challenges(game_id);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at) WHERE status = 'pending' OR status = 'accepted';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_challenges_updated_at ON challenges;
CREATE TRIGGER set_challenges_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_challenges_updated_at();

-- Create function to automatically expire old pending challenges
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS void AS $$
BEGIN
    UPDATE challenges
    SET status = 'expired',
        updated_at = NOW()
    WHERE status IN ('pending', 'accepted')
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to determine winner when both players have completed
CREATE OR REPLACE FUNCTION determine_challenge_winner()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if both scores are present and status is accepted
    IF NEW.challenger_score IS NOT NULL
       AND NEW.challenged_score IS NOT NULL
       AND NEW.status = 'accepted'
       AND OLD.completed_at IS NULL THEN

        -- Determine winner
        IF NEW.challenger_score > NEW.challenged_score THEN
            NEW.winner_id = NEW.challenger_id;
        ELSIF NEW.challenged_score > NEW.challenger_score THEN
            NEW.winner_id = NEW.challenged_id;
        ELSE
            NEW.winner_id = NULL; -- Tie
        END IF;

        -- Mark as completed
        NEW.status = 'completed';
        NEW.completed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for determining winner
DROP TRIGGER IF EXISTS set_challenge_winner ON challenges;
CREATE TRIGGER set_challenge_winner
    BEFORE UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION determine_challenge_winner();

-- NOTE ABOUT RLS:
-- This app uses server-side endpoints (Vercel) + session cookies, not Supabase Auth JWTs.
-- Keep RLS disabled on `challenges` unless you are also implementing Supabase Auth + JWT-based policies.

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================
-- Run these after migration to verify success:
--
-- 1. Check table exists:
-- SELECT EXISTS (
--     SELECT FROM information_schema.tables
--     WHERE table_name = 'challenges'
-- );
--
-- 2. Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'challenges';
--
-- 3. Check triggers:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE event_object_table = 'challenges';
--
-- 4. Test challenge creation:
-- INSERT INTO challenges (challenger_id, challenged_id, game_id, game_title, message)
-- VALUES ('test_player_1', 'test_player_2', 'game1', 'Game 1 Title', 'Think you can beat my score?');
--
-- 5. Test expiration function:
-- SELECT expire_old_challenges();
--
-- ==========================================

-- Add comments for documentation
COMMENT ON TABLE challenges IS 'Player-to-player challenges for specific games';
COMMENT ON COLUMN challenges.status IS 'Challenge lifecycle: pending → accepted/declined → completed/expired';
COMMENT ON COLUMN challenges.expires_at IS 'Challenges expire 7 days after creation if not accepted';
COMMENT ON COLUMN challenges.winner_id IS 'Automatically determined when both scores are submitted';
