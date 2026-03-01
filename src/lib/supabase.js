import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://crcpfwiyjtebmwxfnyep.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyY3Bmd2l5anRlYm13eGZueWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjY3NTgsImV4cCI6MjA4NzkwMjc1OH0.iDrCo14A06EOzTZwc8lEWewdpv-aNp_wmVv5uQVlBlw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
