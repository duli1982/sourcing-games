import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl as string, supabaseAnonKey as string);
  }
  return supabase;
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session ?? null;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ?? null;
};

export const signInWithMagicLink = async (email: string) => {
  const client = getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  if (error) throw error;
};

export const signOut = async () => {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
};
