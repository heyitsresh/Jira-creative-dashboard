// Editable display names for ASIN groups on the By Product tab, backed by
// Supabase. Grouping itself always stays keyed on the raw ASIN extracted
// from the title (lib/asin.js) — this only overrides what that group is
// *displayed* as (sidebar + detail heading), so the Amazon link and the
// underlying grouping never break even if someone renames it to a friendly
// product name.

import { getSupabase } from "../../lib/supabaseServer";

const TABLE = "asin_labels";

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
    const { data, error } = await supabase.from(TABLE).select("asin, label");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ overrides: data || [], configured: true });
  }

  if (req.method === "PUT") {
    const { asin, label } = req.body || {};
    if (!asin) return res.status(400).json({ error: "asin is required." });

    const cleanLabel = (label || "").trim();
    if (!cleanLabel) {
      // Empty label = reset to the raw ASIN, so just remove the override.
      const { error } = await supabase.from(TABLE).delete().eq("asin", asin);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ cleared: true });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ asin, label: cleanLabel.slice(0, 200), updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ override: data });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed." });
}
