-- =====================================================
-- RLS (Row Level Security) Policies for Players Table
-- =====================================================
-- This file sets up the security policies for the players table
-- Run this in Supabase SQL Editor after creating the table

-- First, enable RLS on the players table
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. SELECT Policy - Allow public read access
-- =====================================================
-- Everyone can view the leaderboard and player data
CREATE POLICY "Public read access for leaderboard"
ON players
FOR SELECT
TO public
USING (true);

-- =====================================================
-- 2. INSERT Policy - Only allow authenticated owner inserts
-- =====================================================
CREATE POLICY "Players insert (owner only)"
ON players
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- =====================================================
-- 3. UPDATE Policy - Only allow authenticated owners to modify themselves
-- =====================================================
CREATE POLICY "Players update (owner only)"
ON players
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- =====================================================
-- 4. DELETE Policy - Only allow authenticated owners to delete themselves
-- =====================================================
CREATE POLICY "Players delete (owner only)"
ON players
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- =====================================================
-- Verify policies are active
-- =====================================================
-- Run this query to check if policies are enabled:
-- SELECT * FROM pg_policies WHERE tablename = 'players';
