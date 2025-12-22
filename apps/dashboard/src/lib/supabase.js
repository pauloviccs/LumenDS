import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // Only throw in dev/prod if keys are missing (but we have a check below)
    console.warn('Supabase URL or Key env vars are missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
