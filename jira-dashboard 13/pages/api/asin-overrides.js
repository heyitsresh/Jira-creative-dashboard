// Manual per-task ASIN/product-group reassignment, backed by Supabase —
// this is what powers dragging a task from "No ASIN Detected" (or any
// group) onto a different product on the By Product tab. It overrides
// whatever lib/asin.js auto-detected from the title, for that one task
// only; nothing about the underlying Jira issue changes.

import { getSupabase } from "../../lib/supabaseServer";

const TABLE = "asin_overrides";

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    if (req.method === "GET") {
      return res.status(200).json({ overrides: [], configured: false });
    }
    return res.status(500).json({
      error: "Supabase isn't configured yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase.from(TABLE).select("issue_key, asin");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ overrides: data || [], configured: true });
  }

  if (req.method === "PUT") {
    const { issueKey, asin } = req.body || {};
    if (!issueKey) return res.status(400).json({ error: "issueKey is required." });

    const cleanAsin = (asin || "").trim();
    if (!cleanAsin) {
      // Empty asin = clear the override, revert to whatever the title
      // auto-detects (or "No ASIN Detected" if nothing does).
      const { error } = await supabase.from(TABLE).delete().eq("issue_key", issueKey);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ cleared: true });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .upsert({
        issue_key: issueKey,
        asin: cleanAsin.slice(0, 40),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ override: data });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed." });
}
