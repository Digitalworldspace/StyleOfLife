// ---------------------------------------------------------------
//  Supabase connection settings
//  1) In Supabase: Project Settings -> API
//  2) Paste the "Project URL" and the "anon public" key below.
//  The anon key is meant to be public (safe in this file) because
//  the database rules (RLS) only let visitors READ active products.
//  NEVER paste the "service_role" key here.
// ---------------------------------------------------------------
window.SOL_CONFIG = {
  SUPABASE_URL: "https://ewxflvksxrwizgawjmxj.supabase.co",       // e.g. "https://abcdxyz.supabase.co"
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eGZsdmtzeHJ3aXpnYXdqbXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzE3NDUsImV4cCI6MjEwODg0Nzc0NX0.IxqWTU_n9eu0bt1Gw0UvaZXd851qcylY19gY7fM1mT8"   // e.g. "eyJhbGciOi..."
};
