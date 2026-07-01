// Shared task notes, backed by Supabase. This is the one place in the app
// that writes anything anywhere — and it writes to our own Supabase table,
// never to Jira. Reads/writes go through the service role key server-side
// only; the browser never talks to Supabase directly.

import { getSupabase } from "../../lib/supabaseServer";

const TABLE = "task_notes";
const MAX_BODY_LENGTH = 2000;

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    if (req.method === "GET") {
      // Degrade gracefully so the dashboard still works before Supabase is
      // wired up — just with no notes.
      return res.status(200).json({ notes: [], configured: false });
    }
    return res.status(500).json({
      error:
        "Supabase isn't configured yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  if (req.method === "GET") {
    const keysParam = req.query.issueKeys;
    let query = supabase
      .from(TABLE)
      .select("id, issue_key, author, body, created_at")
      .order("created_at", { ascending: true });

    if (keysParam) {
      const keys = String(keysParam)
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      if (keys.length) query = query.in("issue_key", keys);
    }

    const { data, error } = await query.limit(5000);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ notes: data || [], configured: true });
  }

  if (req.method === "POST") {
    const { issueKey, author, body } = req.body || {};
    if (!issueKey || !body || !String(body).trim()) {
      return res.status(400).json({ error: "issueKey and body are required." });
    }
    const cleanBody = String(body).trim().slice(0, MAX_BODY_LENGTH);
    const cleanAuthor = (author ? String(author).trim() : "").slice(0, 80) || "Anonymous";

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ issue_key: issueKey, author: cleanAuthor, body: cleanBody })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ note: data });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
