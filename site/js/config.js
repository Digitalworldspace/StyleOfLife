// ---------------------------------------------------------------
//  Supabase connection settings
//  1) In Supabase: Project Settings -> API
//  2) Paste the "Project URL" and the "anon public" key below.
//  The anon key is meant to be public (safe in this file) because
//  the database rules (RLS) only let visitors READ active products.
//  NEVER paste the "service_role" key here.
// ---------------------------------------------------------------
window.SOL_CONFIG = {
  SUPABASE_URL: "",       // e.g. "https://abcdxyz.supabase.co"
  SUPABASE_ANON_KEY: ""   // e.g. "eyJhbGciOi..."
};
