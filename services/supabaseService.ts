import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Player } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
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



