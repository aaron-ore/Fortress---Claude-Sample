import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// NEW: Add console logs to verify the environment variables being used
console.log('Supabase Client Init: VITE_SUPABASE_URL =', supabaseUrl);
console.log('Supabase Client Init: VITE_SUPABASE_ANON_KEY =', supabaseAnonKey ? '******** (present)' : 'MISSING/UNDEFINED'); // Mask key for security, indicate if present

let supabase: SupabaseClient;

if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
  console.error("Supabase URL is missing or invalid. Please set VITE_SUPABASE_URL in your .env file or Vercel environment variables.");
  const dummyUrl = "https://dummy.supabase.co";
  const dummyKey = "dummy_anon_key";
  supabase = createClient(dummyUrl, dummyKey);
} else if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim() === '') {
  console.error("Supabase Anon Key is missing or invalid. Please set VITE_SUPABASE_ANON_KEY in your .env file or Vercel environment variables.");
  const dummyKey = "dummy_anon_key";
  supabase = createClient(supabaseUrl, dummyKey);
} else {
  // Trim the anon key to remove any leading/trailing whitespace
  supabase = createClient(supabaseUrl, supabaseAnonKey.trim());
}

export { supabase };