// ============================================================================
// SUPABASE CONFIG — fill these in from your Supabase project
// Project Settings → API → Project URL / anon public key
// ============================================================================
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Shared client instance (used by both catalog.html and admin.html)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
