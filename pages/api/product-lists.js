// Custom, manually-created product "lists" on the By Product sidebar —
// these exist independent of any auto-detected ASIN, so a list can sit
// there empty until you drag tasks onto it. A list can optionally be
// linked to a real ASIN (see the `asin` column) so that any task whose
// title contains that ASIN automatically joins the list too, same as the
// auto-detected groups. Backed by Supabase so lists (and everything
// dragged into them) are shared with anyone the dashboard link is shared
// with.

import { getSupabase } from "../../lib/supabaseServer";

const TABLE = "product_lists";
const OVERRIDES_TABLE = "asin_overrides";

function cleanAsinInput(asin) {
  const trimmed = (asin || "").trim().toUpperCase().slice(0, 40);
  return trimmed || null;
}

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
      .select("name, asin, created_at")
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ lists: data || [], configured: true });
  }

  if (req.method === "POST") {
    const { name, asin } = req.body || {};
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
      .insert({ name: cleanName, asin: cleanAsinInput(asin) })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ list: data });
  }

  if (req.method === "PUT") {
    // Update the ASIN linked to an existing list (e.g. so tasks with that
    // ASIN auto-join it going forward). Renaming isn't supported here —
    // use the pencil-edit label on the tab itself for that.
    const { name, asin } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required." });

    const { data, error } = await supabase
      .from(TABLE)
      .update({ asin: cleanAsinInput(asin) })
      .eq("name", name)
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

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
}
