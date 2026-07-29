// Lightweight "who's here right now" presence, backed by the same
// Supabase project as notes. Each browser tab sends an anonymous heartbeat
// every ~15s with a random id it generates for itself (no name, no login);
// anyone whose last heartbeat was within the ACTIVE_WINDOW is considered
// "currently viewing". This is a poll-based approximation of presence, not
// true realtime — consistent with the rest of the app's read-only,
// server-side-only relationship with Supabase.

import { getSupabase } from "../../lib/supabaseServer";

const TABLE = "active_viewers";
const ACTIVE_WINDOW_SECONDS = 45;
const STALE_CLEANUP_HOURS = 1;

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    if (req.method === "GET") {
      return res.status(200).json({ viewers: [], configured: false });
    }
    return res.status(200).json({ ok: false, configured: false });
  }

  if (req.method === "POST") {
    const { visitorId } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") {
      return res.status(400).json({ error: "visitorId is required." });
    }
    const { error } = await supabase
      .from(TABLE)
      .upsert({ visitor_id: visitorId.slice(0, 64), last_seen: new Date().toISOString() });
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Opportunistic cleanup so this table never grows unbounded — no cron
    // needed, it just tidies up a little on every heartbeat.
    const cutoff = new Date(Date.now() - STALE_CLEANUP_HOURS * 3600 * 1000).toISOString();
    await supabase.from(TABLE).delete().lt("last_seen", cutoff);

    return res.status(200).json({ ok: true, configured: true });
  }

  if (req.method === "GET") {
    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_SECONDS * 1000).toISOString();
    const { data, error } = await supabase
      .from(TABLE)
      .select("visitor_id, last_seen")
      .gte("last_seen", cutoff);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({
      viewers: (data || []).map((v) => v.visitor_id),
      configured: true,
    });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
