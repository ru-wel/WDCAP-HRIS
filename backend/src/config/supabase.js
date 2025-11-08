import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseURL = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseURL || !supabaseServiceKey){
  throw new Error('Missing Supabase credentials. Please check the .env file');
}

// service role key from supabase gives full admin access, bypassing Row Level Security
export const supabase = createClient(supabaseURL, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

export { supabaseURL };