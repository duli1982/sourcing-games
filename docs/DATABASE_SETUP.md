# Database Setup Guide

This guide explains how to set up the Supabase database for the Sourcing AI Games platform.

## Prerequisites

1. A Supabase project created
2. Access to Supabase SQL Editor
3. Environment variables configured in your `.env` file:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_DASH_TOKEN`

## Migration Order

**IMPORTANT**: Run these migrations in the exact order listed below.

### 1. Initial Schema (REQUIRED FIRST)
**File**: `supabase_initial_schema.sql`

Creates the base tables:
- `players` - Player accounts and progress
- `game_overrides` - Admin game configuration
- `admin_events` - Audit logging

**Run this first** if you're setting up a new database.

```sql
-- Check if players table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'players'
);
-- If returns FALSE, run supabase_initial_schema.sql
```

### 2. Session Token Migration (Optional - if not in initial schema)
**File**: `supabase_migration_session_token.sql`

Adds session token support (already included in initial schema above).

**Skip this** if you ran the initial schema, as it already includes session tokens.

### 3. Social Features Migration
**File**: `supabase_social_features_migration.sql`

Adds player profile features:
- Bio
- Avatar URL
- Profile visibility (public/private)
- Social links

**Status**: ✅ Completed (per roadmap)

### 4. Teams Migration
**File**: `supabase_teams_migration.sql`

Creates team competition features:
- `teams` - Team definitions
- `team_members` - Team membership

**Status**: 🟨 Ready to run (this is what you're working on now)

## Step-by-Step Setup

### For a Fresh Database:

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Run Initial Schema**
   ```
   Copy contents of: supabase_initial_schema.sql
   Paste into SQL Editor
   Click "Run"
   ```

3. **Verify Initial Setup**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('players', 'game_overrides', 'admin_events');
   ```
   Should return 3 rows.

4. **Run Social Features Migration** (if not already done)
   ```
   Copy contents of: supabase_social_features_migration.sql
   Paste into SQL Editor
   Click "Run"
   ```

5. **Run Teams Migration**
   ```
   Copy contents of: supabase_teams_migration.sql
   Paste into SQL Editor
   Click "Run"
   ```

### For Existing Database:

If you already have a `players` table:

1. **Check what you have**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

2. **Check if social features are installed**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'players'
   AND column_name IN ('bio', 'avatar_url', 'profile_visibility');
   ```

3. **Run missing migrations only**
   - If social features columns don't exist, run `supabase_social_features_migration.sql`
   - Then run `supabase_teams_migration.sql`

## Troubleshooting

### Error: "relation 'players' does not exist"
**Solution**: Run `supabase_initial_schema.sql` first.

### Error: "column already exists"
**Solution**: That migration was already run. Skip to the next one.

### Error: "permission denied"
**Solution**: Make sure you're using the service role key, not the anon key.

## Verification Queries

After running all migrations, verify everything is set up:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('players', 'teams', 'team_members', 'game_overrides', 'admin_events')
ORDER BY table_name;

-- Check players table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;

-- Check teams table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teams'
ORDER BY ordinal_position;

-- Check row counts (should be 0 for fresh install)
SELECT
  (SELECT COUNT(*) FROM players) as players_count,
  (SELECT COUNT(*) FROM teams) as teams_count,
  (SELECT COUNT(*) FROM team_members) as team_members_count;
```

## Environment Variables

After database setup, ensure these are configured in Vercel/local `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
ADMIN_DASH_TOKEN=your-secure-admin-token
GEMINI_API_KEY=your-gemini-api-key
```

## Next Steps

After database setup:
1. Test the application locally
2. Create a test player account
3. Try creating a team
4. Test team invite codes
5. Deploy to Vercel

---

**Last Updated**: December 18, 2025
**Database Version**: 1.0 (Teams support)
