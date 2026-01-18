import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Player, PublicPlayer, PlayerStats, Team, TeamMember, CreateTeamData, TeamLeaderboardEntry } from '../types.js';
import { generateInviteCode } from '../utils/teamUtils.js';

// Support both Vite (import.meta.env) and Node.js (process.env) environments
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env.VITE_SUPABASE_URL
  : (typeof process !== 'undefined' && process.env)
    ? (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)
    : undefined;

const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : (typeof process !== 'undefined' && process.env)
    ? (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
    : undefined;

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const supabaseClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

const ensureConfig = () => {
  if (!isSupabaseConfigured || !supabaseClient) {
    console.warn('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return Boolean(supabaseClient);
};

const mapPlayer = (row: any): Player => ({
  id: row.id,
  name: row.name,
  score: row.score ?? 0,
  status: row.status ?? 'active',
  sessionToken: row.session_token,
  attempts: row.progress?.attempts || [],
  achievements: row.progress?.achievements || [],
  pinHash: row.progress?.pinHash || undefined,
  // Profile fields
  bio: row.bio,
  avatarUrl: row.avatar_url,
  profileVisibility: row.profile_visibility || 'public',
  socialLinks: row.social_links || {},
  createdAt: row.created_at,
});

export const fetchLeaderboard = async (): Promise<Player[]> => {
  if (!ensureConfig() || !supabaseClient) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from('players')
      .select('id, name, score, progress')
    .order('score', { ascending: false });

  if (error) {
    console.error('Failed to fetch leaderboard from Supabase:', error);
    return [];
  }

  return data?.map((row: any) => ({
    id: row.id,
    name: row.name,
    score: row.score ?? 0,
    status: row.status ?? 'active',
    attempts: row.progress?.attempts || [],
    achievements: row.progress?.achievements || [],
  })) ?? [];
};

export const isNameTaken = async (name: string): Promise<boolean> => {
  if (!ensureConfig() || !supabaseClient) {
    return false;
  }
  // Use ilike for case-insensitive comparison
  const { data, error } = await supabaseClient
    .from('players')
    .select('name')
    .ilike('name', name)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    console.error('Failed to check name availability:', error);
    return false;
  }
  return Boolean(data);
};

export const deletePlayer = async (name: string): Promise<void> => {
  if (!ensureConfig() || !supabaseClient) {
    return;
  }
  const { error } = await supabaseClient.from('players').delete().eq('name', name);
  if (error) {
    console.error('Failed to delete player:', error);
  }
};

export const renamePlayer = async (
  oldName: string,
  newName: string,
  score: number,
  playerId?: string,
  progress?: Record<string, unknown>
): Promise<boolean> => {
  if (!ensureConfig() || !supabaseClient) {
    return false;
  }
  try {
    const taken = await isNameTaken(newName);
    if (taken) return false;
    // create new record first
    const { error: upsertError } = await supabaseClient.from('players').upsert({ id: playerId, name: newName, score: score, progress, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (upsertError) throw upsertError;
    // delete the old record
    const { error: delError } = await supabaseClient.from('players').delete().eq('name', oldName);
    if (delError) throw delError;
    return true;
  } catch (error) {
    console.error('Failed to rename player:', error);
    return false;
  }
};

export const syncPlayerRecord = async (
  player: Player,
  progress?: Record<string, unknown>
): Promise<void> => {
  if (!ensureConfig() || !supabaseClient) {
    return;
  }

  try {
    await supabaseClient.from('players').upsert({ id: (player as any).id, name: player.name, score: player.score, progress: { ...(progress || {}), pinHash: player.pinHash || null }, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  } catch (error) {
    console.error('Failed to sync player record to Supabase:', error);
  }
};

/**
 * Fetch player by ID (primary key lookup)
 * Returns player with attempts and achievements from progress JSONB field
 */
export const fetchPlayerById = async (id: string): Promise<Player | null> => {
  if (!ensureConfig() || !supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to fetch player by ID:', error);
      return null;
    }

    return mapPlayer(data);
  } catch (error) {
    console.error('Error fetching player:', error);
    return null;
  }
};

/**
 * Fetch player by session token
 * Returns player if valid session token exists
 */
export const fetchPlayerBySessionToken = async (sessionToken: string): Promise<Player | null> => {
  if (!ensureConfig() || !supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to fetch player by session token:', error);
      return null;
    }

    return mapPlayer(data);
  } catch (error) {
    console.error('Error fetching player by session token:', error);
    return null;
  }
};

/**
 * Fetch player by name (case-insensitive)
 * Used for returning users who lost their session
 */
export const fetchPlayerByName = async (name: string): Promise<Player | null> => {
  if (!ensureConfig() || !supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .select('*')
      .ilike('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to fetch player by name:', error);
      return null;
    }

    return mapPlayer(data);
  } catch (error) {
    console.error('Error fetching player by name:', error);
    return null;
  }
};

/**
 * Create new player in Supabase with session token
 * Returns player with DB-generated UUID and session token
 */
export const createPlayer = async (name: string, sessionToken: string, pinHash?: string | null): Promise<Player | null> => {
  if (!ensureConfig() || !supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .insert({
        name,
        score: 0,
        status: 'active',
        session_token: sessionToken,
        progress: { attempts: [], achievements: [], pinHash: pinHash || null },
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create player:', error);
      return null;
    }

    return mapPlayer(data);
  } catch (error) {
    console.error('Error creating player:', error);
    return null;
  }
};

/**
 * Update existing player in Supabase
 * Returns updated player data from server
 */
export const updatePlayer = async (player: Player): Promise<Player | null> => {
  if (!ensureConfig() || !supabaseClient || !player.id) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .update({
        name: player.name,
        score: player.score,
        session_token: player.sessionToken,
        progress: {
          attempts: player.attempts,
          achievements: player.achievements,
          pinHash: player.pinHash || null
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', player.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update player:', error);
      return null;
    }

    return mapPlayer(data);
  } catch (error) {
    console.error('Error updating player:', error);
    return null;
  }
};

/**
 * Update session token for existing player
 * Used when returning user logs back in
 */
export const updatePlayerSessionToken = async (playerId: string, sessionToken: string): Promise<Player | null> => {
  if (!ensureConfig() || !supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .update({
        session_token: sessionToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update session token:', error);
      return null;
    }

    return mapPlayer(data);
  } catch (error) {
    console.error('Error updating session token:', error);
    return null;
  }
};

/**
 * Fetch public player profile by name (case-insensitive)
 * Returns only public information, respecting privacy settings
 * Used for /player/[name] routes
 */
export const fetchPublicPlayerByName = async (name: string): Promise<PublicPlayer | null> => {
  if (!ensureConfig() || !supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .select('id, name, score, bio, avatar_url, profile_visibility, social_links, progress, created_at')
      .ilike('name', name)
      .eq('status', 'active') // Only return active players
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to fetch public player profile:', error);
      return null;
    }

    // Respect privacy settings
    if (data.profile_visibility === 'private') {
      return null; // Return null for private profiles
    }

    // Extract attempts and achievements from progress JSONB
    const attempts = data.progress?.attempts || [];
    const achievements = data.progress?.achievements || [];

    // Calculate player stats
    const totalGamesPlayed = attempts.length;
    const avgScore = totalGamesPlayed > 0
      ? Math.round(attempts.reduce((sum: number, a: any) => sum + a.score, 0) / totalGamesPlayed)
      : 0;
    const bestScore = totalGamesPlayed > 0
      ? Math.max(...attempts.map((a: any) => a.score))
      : 0;

    // Group attempts by game
    const gameBreakdown: { [key: string]: { gameId: string; gameTitle: string; attempts: number; bestScore: number } } = {};
    attempts.forEach((attempt: any) => {
      if (!gameBreakdown[attempt.gameId]) {
        gameBreakdown[attempt.gameId] = {
          gameId: attempt.gameId,
          gameTitle: attempt.gameTitle,
          attempts: 0,
          bestScore: 0
        };
      }
      gameBreakdown[attempt.gameId].attempts += 1;
      gameBreakdown[attempt.gameId].bestScore = Math.max(
        gameBreakdown[attempt.gameId].bestScore,
        attempt.score
      );
    });

    const stats: PlayerStats = {
      totalGamesPlayed,
      averageScore: avgScore,
      bestScore,
      totalPoints: data.score ?? 0,
      gameBreakdown: Object.values(gameBreakdown)
    };

    // Return public profile (no sensitive data like email, sessionToken, pinHash)
    return {
      name: data.name,
      score: data.score ?? 0,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      socialLinks: data.social_links || {},
      achievements: achievements.map((ach: any) => ({
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        unlockedAt: ach.unlockedAt
      })),
      stats,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error fetching public player profile:', error);
    return null;
  }
};

// ============================================================================
// TEAM FUNCTIONS
// ============================================================================

/**
 * Helper function to map database row to Team object
 */
const mapTeam = (row: any): Team => ({
  id: row.id,
  name: row.name,
  description: row.description,
  inviteCode: row.invite_code,
  logoUrl: row.logo_url,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  memberCount: row.member_count ?? 0,
  maxMembers: row.max_members ?? 50,
  isActive: row.is_active ?? true,
});

/**
 * Helper function to map database row to TeamMember object
 */
const mapTeamMember = (row: any): TeamMember => ({
  id: row.id,
  teamId: row.team_id,
  playerId: row.player_id,
  playerName: row.player_name,
  role: row.role,
  joinedAt: row.joined_at,
});

/**
 * Create a new team
 */
export const createTeam = async (
  teamData: CreateTeamData,
  playerName: string,
  playerId: string
): Promise<Team | null> => {
  console.log('createTeam called with:', { teamData, playerName, playerId });
  console.log('Supabase config check:', {
    isConfigured: isSupabaseConfigured,
    hasClient: !!supabaseClient,
    supabaseUrl,
    hasAnonKey: !!supabaseAnonKey
  });

  if (!ensureConfig() || !supabaseClient) {
    console.error('Supabase not configured or client is null');
    return null;
  }

  try {
    // Generate unique invite code
    const inviteCodePretty = generateInviteCode();
    const inviteCode = inviteCodePretty.replace(/-/g, '').toUpperCase();
    console.log('Generated invite code:', inviteCodePretty);

    // Insert team
    const { data: teamRow, error: teamError } = await supabaseClient
      .from('teams')
      .insert({
        name: teamData.name,
        description: teamData.description,
        logo_url: teamData.logoUrl,
        invite_code: inviteCode,
        created_by: playerName,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Failed to create team in database:', teamError);
      return null;
    }

    console.log('Team created successfully:', teamRow);

    // Add creator as team owner
    const { error: memberError } = await supabaseClient
      .from('team_members')
      .insert({
        team_id: teamRow.id,
        player_id: playerId,
        player_name: playerName,
        role: 'owner',
      });

    if (memberError) {
      console.error('Failed to add team owner:', memberError);
      // Rollback: delete the team
      await supabaseClient.from('teams').delete().eq('id', teamRow.id);
      return null;
    }

    return mapTeam(teamRow);
  } catch (error) {
    console.error('Error creating team:', error);
    return null;
  }
};

/**
 * Join a team with invite code
 */
export const joinTeamWithCode = async (
  inviteCode: string,
  playerName: string,
  playerId: string
): Promise<Team | null> => {
  if (!ensureConfig() || !supabaseClient) {
    return null;
  }

  try {
    // Find team by invite code
    const { data: teamRow, error: teamError } = await supabaseClient
      .from('teams')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase().replace(/-/g, ''))
      .eq('is_active', true)
      .single();

    if (teamError || !teamRow) {
      console.error('Team not found or inactive:', teamError);
      return null;
    }

    const team = mapTeam(teamRow);

    // Check if already a member
    const { data: existingMember } = await supabaseClient
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('player_id', playerId)
      .single();

    if (existingMember) {
      // Already a member, just return the team
      return team;
    }

    // Check if team is full
    if (team.memberCount >= team.maxMembers) {
      throw new Error('Team is full');
    }

    // Add member
    const { error: memberError } = await supabaseClient
      .from('team_members')
      .insert({
        team_id: team.id,
        player_id: playerId,
        player_name: playerName,
        role: 'member',
      });

    if (memberError) {
      console.error('Failed to join team:', memberError);
      return null;
    }

    return team;
  } catch (error) {
    console.error('Error joining team:', error);
    return null;
  }
};

/**
 * Leave a team
 */
export const leaveTeam = async (
  teamId: string,
  playerId: string
): Promise<boolean> => {
  if (!ensureConfig() || !supabaseClient) {
    return false;
  }

  try {
    // Check if user is the owner
    const { data: member } = await supabaseClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('player_id', playerId)
      .single();

    if (!member) {
      return false; // Not a member
    }

    if (member.role === 'owner') {
      // Owner cannot leave, must delete team or transfer ownership
      throw new Error('Team owner cannot leave. Delete the team or transfer ownership first.');
    }

    // Remove member
    const { error } = await supabaseClient
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('player_id', playerId);

    if (error) {
      console.error('Failed to leave team:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error leaving team:', error);
    return false;
  }
};

/**
 * Fetch team details with members
 */
export const fetchTeamDetails = async (teamId: string): Promise<Team | null> => {
  if (!ensureConfig() || !supabaseClient) {
    return null;
  }

  try {
    // Fetch team
    const { data: teamRow, error: teamError } = await supabaseClient
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !teamRow) {
      console.error('Team not found:', teamError);
      return null;
    }

    const team = mapTeam(teamRow);

    // Fetch members
    const { data: memberRows, error: memberError } = await supabaseClient
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (memberError) {
      console.error('Failed to fetch team members:', memberError);
      return team; // Return team without members
    }

    const members = memberRows.map(mapTeamMember);

    // Fetch member scores from players table
    const playerIds = members.map((m) => m.playerId);
    const { data: playerRows } = await supabaseClient
      .from('players')
      .select('id, score')
      .in('id', playerIds);

    const scoreMap = new Map(
      playerRows?.map((p) => [p.id, p.score]) || []
    );

    // Attach scores to members
    members.forEach((member) => {
      member.score = scoreMap.get(member.playerId) || 0;
    });

    // Calculate average score
    const totalScore = members.reduce((sum, m) => sum + (m.score || 0), 0);
    team.averageScore = members.length > 0 ? Math.round(totalScore / members.length) : 0;
    team.members = members;

    return team;
  } catch (error) {
    console.error('Error fetching team details:', error);
    return null;
  }
};

/**
 * Fetch all teams the player is a member of
 */
export const fetchPlayerTeams = async (playerId: string): Promise<Team[]> => {
  if (!ensureConfig() || !supabaseClient) {
    return [];
  }

  try {
    // Fetch team memberships
    const { data: memberRows, error: memberError } = await supabaseClient
      .from('team_members')
      .select('team_id')
      .eq('player_id', playerId);

    if (memberError || !memberRows || memberRows.length === 0) {
      return [];
    }

    const teamIds = memberRows.map((m) => m.team_id);

    // Fetch teams
    const { data: teamRows, error: teamError } = await supabaseClient
      .from('teams')
      .select('*')
      .in('id', teamIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (teamError || !teamRows) {
      console.error('Failed to fetch player teams:', teamError);
      return [];
    }

    return teamRows.map(mapTeam);
  } catch (error) {
    console.error('Error fetching player teams:', error);
    return [];
  }
};

/**
 * Fetch team leaderboard (top teams by average score)
 */
export const fetchTeamLeaderboard = async (limit: number = 50): Promise<TeamLeaderboardEntry[]> => {
  if (!ensureConfig() || !supabaseClient) {
    return [];
  }

  try {
    // Fetch all teams
    const { data: teamRows, error: teamError } = await supabaseClient
      .from('teams')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (teamError || !teamRows) {
      return [];
    }

    const teams = teamRows.map(mapTeam);

    // For each team, calculate average score
    const leaderboardEntries: TeamLeaderboardEntry[] = [];

    for (const team of teams) {
      // Fetch team members
      const { data: memberRows } = await supabaseClient
        .from('team_members')
        .select('player_id')
        .eq('team_id', team.id);

      if (!memberRows || memberRows.length === 0) {
        continue; // Skip teams with no members
      }

      const playerIds = memberRows.map((m) => m.player_id);

      // Fetch player scores
      const { data: playerRows } = await supabaseClient
        .from('players')
        .select('score')
        .in('id', playerIds);

      const scores = playerRows?.map((p) => p.score ?? 0) || [];
      const averageScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;

      leaderboardEntries.push({
        team,
        averageScore,
        totalMembers: memberRows.length,
        rank: 0, // Will be set after sorting
      });
    }

    // Sort by average score descending
    leaderboardEntries.sort((a, b) => b.averageScore - a.averageScore);

    // Assign ranks
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboardEntries.slice(0, limit);
  } catch (error) {
    console.error('Error fetching team leaderboard:', error);
    return [];
  }
};

// ===== CHALLENGES FUNCTIONS =====

/**
 * Fetch player's challenges (sent and received)
 */
export const fetchPlayerChallenges = async (playerId: string) => {
  try {
    const response = await fetch(`/api/challenges?action=my-challenges&playerId=${encodeURIComponent(playerId)}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch challenges');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching player challenges:', error);
    return [];
  }
};

/**
 * Create a new challenge
 */
export const createChallenge = async (challengeData: { challenged_id: string; game_id: string; game_title: string; message?: string }) => {
  try {
    const response = await fetch('/api/challenges?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(challengeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create challenge');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
};

/**
 * Accept a challenge
 */
export const acceptChallenge = async (challengeId: string) => {
  try {
    const response = await fetch(`/api/challenges?action=accept&challengeId=${challengeId}`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to accept challenge');
    }

    return await response.json();
  } catch (error) {
    console.error('Error accepting challenge:', error);
    throw error;
  }
};

/**
 * Decline a challenge
 */
export const declineChallenge = async (challengeId: string) => {
  try {
    const response = await fetch(`/api/challenges?action=decline&challengeId=${challengeId}`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to decline challenge');
    }

    return await response.json();
  } catch (error) {
    console.error('Error declining challenge:', error);
    throw error;
  }
};

/**
 * Submit score for a challenge
 */
export const submitChallengeScore = async (challengeId: string, score: number) => {
  try {
    const response = await fetch('/api/challenges?action=submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ challengeId, score })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit score');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting challenge score:', error);
    throw error;
  }
};
