import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const getServiceSupabase = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const isMissingTableError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const maybe = err as { code?: unknown };
  return maybe.code === 'PGRST205';
};

