/**
 * Supabase client and database helper setup
 */
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  };
}

// Instantiate and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
