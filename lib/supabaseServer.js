// Server-only Supabase client. Uses the service role key, which must never
// be exposed to the browser — that's why notes are only ever read/written
// through pages/api/notes.js, never directly from client components.
import { createClient } from "@supabase/supabase-js";

let cached = null;

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return cached;
}
