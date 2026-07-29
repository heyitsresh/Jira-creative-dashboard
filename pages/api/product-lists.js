// Custom, manually-created product "lists" on the By Product sidebar —
// these exist independent of any auto-detected ASIN, so a list can sit
// there empty until you drag tasks onto it. Backed by Supabase so the
// lists (and who's dragged what into them, via asin_overrides) are shared
// with anyone the dashboard link is shared with.

import { getSupabase } from "../../lib/supabaseServer";

const TABLE = "product_lists";
const OVERRIDES_TABLE = "asin_overrides";

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    if (req.method === "GET") {
      return res.status(200).json({ lists: [], configured: false });
    }
    return res.status(500).json({
      error: "Supabase isn't configured yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from(TABLE)
      .select("name, created_at")
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ lists: data || [], configured: true });
  }

  if (req.method === "POST") {
    const { name } = req.body || {};
    const cleanName = (name || "").trim().slice(0, 80);
    if (!cleanName) return res.status(400).json({ error: "A list name is required." });

    const { data: existing } = await supabase
      .from(TABLE)
      .select("name")
      .ilike("name", cleanName)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: "A list with that name already exists." });

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ name: cleanName })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ list: data });
  }

  if (req.method === "DELETE") {
    const name = (req.query.name || req.body?.name || "").toString();
    if (!name) return res.status(400).json({ error: "name is required." });

    const { error: delErr } = await supabase.from(TABLE).delete().eq("name", name);
    if (delErr) return res.status(500).json({ error: delErr.message });

    // Any tasks manually dropped onto this list move back to their
    // auto-detected group rather than pointing at a list that no longer
    // exists.
    await supabase.from(OVERRIDES_TABLE).delete().eq("asin", name);

    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
}
