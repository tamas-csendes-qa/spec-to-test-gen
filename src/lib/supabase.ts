import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  email: string;
  company_id: string | null;
  max_concurrent_sessions: number;
  monthly_generation_limit: number;
  is_admin: boolean;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  session_token: string;
  created_at: string;
  last_active: string;
};

export type UsageLog = {
  id: string;
  user_id: string;
  company_id: string | null;
  tab_type: string;
  output_format: string;
  token_count: number;
  created_at: string;
};
