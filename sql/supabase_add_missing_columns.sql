-- =====================================================
-- ADD MISSING COLUMNS TO EXISTING PLAYERS TABLE
-- =====================================================
-- Use this if you want to keep existing player data
-- This migration adds any missing columns without dropping the table

-- =====================================================
-- Step 1: Add id column as primary key (if missing)
-- =====================================================
-- Check if id column exists, if not add it
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'id'
  ) THEN
    -- First, drop existing primary key if any
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'players'::regclass
    AND contype = 'p';

    IF constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE players DROP CONSTRAINT %I', constraint_name);
      RAISE NOTICE 'Dropped existing primary key: %', constraint_name;
    END IF;

    -- Add id column as UUID with default value
    ALTER TABLE players ADD COLUMN id UUID DEFAULT gen_random_uuid();

    -- Backfill any existing rows that might have NULL id
    UPDATE players SET id = gen_random_uuid() WHERE id IS NULL;

    -- Make id NOT NULL
    ALTER TABLE players ALTER COLUMN id SET NOT NULL;

    -- Set it as primary key
    ALTER TABLE players ADD PRIMARY KEY (id);

    RAISE NOTICE 'Added id column as primary key to players table';
  ELSE
    RAISE NOTICE 'id column already exists';
  END IF;
END $$;

-- =====================================================
-- Step 2: Add other missing columns (if any)
-- =====================================================

-- Add name column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'name'
  ) THEN
    ALTER TABLE players ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown';
    RAISE NOTICE 'Added name column to players table';
  END IF;
END $$;

-- Add score column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'score'
  ) THEN
    ALTER TABLE players ADD COLUMN score INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added score column to players table';
  END IF;
END $$;

-- Add email column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'email'
  ) THEN
    ALTER TABLE players ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to players table';
  END IF;
END $$;

-- Add session_token column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'session_token'
  ) THEN
    ALTER TABLE players ADD COLUMN session_token TEXT UNIQUE;
    RAISE NOTICE 'Added session_token column to players table';
  END IF;
END $$;

-- Add progress column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'progress'
  ) THEN
    ALTER TABLE players ADD COLUMN progress JSONB DEFAULT '{
      "attempts": [],
      "achievements": []
    }'::jsonb;
    RAISE NOTICE 'Added progress column to players table';
  END IF;
END $$;

-- Add owner_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE players ADD COLUMN owner_id UUID REFERENCES auth.users(id);
    RAISE NOTICE 'Added owner_id column to players table (remember to backfill and enforce NOT NULL)';
  END IF;
END $$;

-- Add created_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE players ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to players table';
  END IF;
END $$;

-- Add updated_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE players ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to players table';
  END IF;
END $$;

-- =====================================================
-- Step 3: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_session_token ON players(session_token);
CREATE INDEX IF NOT EXISTS idx_players_score ON players(score DESC);

-- =====================================================
-- Step 4: Enable Row Level Security
-- =====================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Step 5: Create RLS Policies (drop existing first to avoid conflicts)
-- =====================================================
DROP POLICY IF EXISTS "Public read access for leaderboard" ON players;
DROP POLICY IF EXISTS "Public insert for new players" ON players;
DROP POLICY IF EXISTS "Public update access" ON players;
DROP POLICY IF EXISTS "Public delete access" ON players;

-- Create fresh policies
CREATE POLICY "Public read access for leaderboard"
ON players FOR SELECT TO public USING (true);

CREATE POLICY "Public insert for new players"
ON players FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public update access"
ON players FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access"
ON players FOR DELETE TO public USING (true);

-- =====================================================
-- Step 6: Verify the setup
-- =====================================================
-- Check all columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;
