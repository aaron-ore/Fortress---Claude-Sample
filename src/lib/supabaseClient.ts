import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
  console.error("Fortress backend configuration is missing. Check your environment configuration.");
  const dummyUrl = "https://placeholder.invalid";
  const dummyKey = "placeholder_key";
  supabase = createClient(dummyUrl, dummyKey);
} else if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim() === '') {
  console.error("Fortress backend configuration is missing. Check your environment configuration.");
  const dummyKey = "placeholder_key";
  supabase = createClient(supabaseUrl, dummyKey);
} else {
  // Trim the anon key to remove any leading/trailing whitespace
  supabase = createClient(supabaseUrl, supabaseAnonKey.trim());
}

// Base URL for Edge Functions, derived from configuration so the backend
// identifier is never hard-coded in application source.
export const supabaseFunctionsUrl =
  supabaseUrl && typeof supabaseUrl === 'string'
    ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1`
    : '';

export { supabase };
