import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key };
};

export const createSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  return createClient(url, key);
};

let _client: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key);
  }
  return _client;
};

export const resetSupabaseClient = () => {
  _client = null;
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  return !!(url && key);
};
