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

export const fetchLeaderboard = async (): Promise<Player[]> => {
  if (!ensureConfig() || !supabaseClient) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from('players')
    .select('id, name, score')
    .order('score', { ascending: false });

  if (error) {
    console.error('Failed to fetch leaderboard from Supabase:', error);
    return [];
  }

  return data?.map((row: any) => ({ id: row.id, name: row.name, score: row.score ?? 0 })) ?? [];
};

export const isNameTaken = async (name: string): Promise<boolean> => {
  if (!ensureConfig() || !supabaseClient) {
    return false;
  }
  const { data, error } = await supabaseClient
    .from('players')
    .select('name')
    .eq('name', name)
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
  progress?: Record<string, unknown>
): Promise<boolean> => {
  if (!ensureConfig() || !supabaseClient) {
    return false;
  }
  try {
    const taken = await isNameTaken(newName);
    if (taken) return false;
    // create new record first
    const { error: upsertError } = await supabaseClient.from('players').upsert({ id: (player as any).id, name: player.name, score: player.score, progress, updated_at: new Date().toISOString() }, { onConflict: 'id' });
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
    await supabaseClient.from('players').upsert({ id: (player as any).id, name: player.name, score: player.score, progress, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  } catch (error) {
    console.error('Failed to sync player record to Supabase:', error);
  }
};



