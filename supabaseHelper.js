import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  window.SUPABASE_URL ||
  "https://hrpxfnrizypnqwsiasqw.supabase.co";

const SUPABASE_ANON_KEY =
  window.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycHhmbnJpenlwbnF3c2lhc3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY1MjUsImV4cCI6MjA3NDU4MjUyNX0.4btbG22BF7WWtCvq1Du7Bo0aLcKHZIUV4MBwPQW53eY";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase credentials missing");
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
