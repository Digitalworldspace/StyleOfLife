// ============================================================================
// SUPABASE CONFIG — fill these in from your Supabase project
// Project Settings → API → Project URL / anon public key
// ============================================================================
const SUPABASE_URL = "https://cbxeecckmkxvrbayhohe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_e6VwSqO7R-MYAj_A3FNliA_qah9ct1p";

// Shared client instance (used by both catalog.html and admin.html)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
