import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Pencil, Check, X } from "lucide-react";
import IssueTable from "./IssueTable";
import { getDueBucket, groupBy } from "../lib/issueUtils";
import { colorForKey } from "../lib/colors";
import { BRAND_LABELS } from "../lib/clientConfig";

const NO_ASIN = "No ASIN Detected";
const LABELS_POLL_MS = 20000;

export default function ProductTab({ issues }) {
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  // Editable display labels per raw ASIN, shared via Supabase so a rename
  // shows up for everyone (sidebar + heading), same pattern as notes.
  const [labels, setLabels] = useState({});
  const [labelsConfigured, setLabelsConfigured] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const loadLabels = useCallback(async () => {
    try {
      const resp = await fetch("/api/asin-labels");
      const data = await resp.json();
      if (!resp.ok) return;
      setLabelsConfigured(data.configured !== false);
      const map = {};
      for (const o of data.overrides || []) map[o.asin] = o.label;
      setLabels(map);
    } catch {
      // Labels are a nice-to-have layered on top of the Jira data.
    }
  }, []);

  useEffect(() => {
    loadLabels();
    const id = setInterval(loadLabels, LABELS_POLL_MS);
    return () => clearInterval(id);
  }, [loadLabels]);

  function displayName(rawAsin) {
    return labels[rawAsin] || rawAsin;
  }

  const brandCounts = useMemo(() => {
    const byBrand = groupBy(issues, (i) => i.client);
    const map = new Map(byBrand.map((b) => [b.name, b.count]));
    return BRAND_LABELS.map((label) => ({ label, count: map.get(label) || 0 }));
  }, [issues]);

  const brandFilteredIssues = useMemo(
    () =>
      selectedBrands.length
        ? issues.filter((i) => selectedBrands.includes(i.client))
        : issues,
    [issues, selectedBrands]
  );

  const byProduct = useMemo(() => {
    const groups = groupBy(brandFilteredIssues, (i) => i.asin || NO_ASIN);
    return groups.map((g) => ({
      ...g,
      overdue: g.issues.filter((i) => getDueBucket(i.dueDate) === "Overdue").length,
    }));
  }, [brandFilteredIssues]);

  useEffect(() => {
    if (selected && !byProduct.some((g) => g.name === selected)) {
      setSelected(null);
    }
  }, [byProduct, selected]);

  const activeProduct = selected || byProduct[0]?.name || null;
  const productIssues = useMemo(
    () => brandFilteredIssues.filter((i) => (i.asin || NO_ASIN) === activeProduct),
    [brandFilteredIssues, activeProduct]
  );

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return byProduct;
    return byProduct.filter(
      (g) => g.name.toLowerCase().includes(q) || displayName(g.name).toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byProduct, search, labels]);

  function toggleBrand(label) {
    setSelectedBrands((prev) =>
      prev.includes(label) ? prev.filter((b) => b !== label) : [...prev, label]
    );
  }

  function startEditing() {
    setEditValue(labels[activeProduct] || "");
    setEditing(true);
  }

  async function saveLabel() {
    setSaving(true);
    try {
      const resp = await fetch("/api/asin-labels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: activeProduct, label: editValue.trim() }),
      });
      if (!resp.ok) throw new Error((await resp.json())?.error || "Failed to save.");
      setLabels((prev) => {
        const next = { ...prev };
        if (editValue.trim()) next[activeProduct] = editValue.trim();
        else delete next[activeProduct];
        return next;
      });
      setEditing(false);
    } catch {
      // Leave the editor open so they can retry.
    } finally {
      setSaving(false);
    }
  }

  if (issues.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No open tasks.</p>;
  }

  const isEditable = activeProduct && activeProduct !== NO_ASIN;

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        Grouped by ASIN pulled from each task's title — tasks whose title doesn't contain a
        recognizable ASIN land under &ldquo;{NO_ASIN}&rdquo;. Edit{" "}
        <code className="bg-slate-100 px-1 py-0.5 rounded">lib/asin.js</code> if your titles use a
        different pattern. Click the pencil next to a product's heading to give it a friendlier
        name — grouping still keys off the real ASIN underneath, so nothing breaks.
      </p>

      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 mb-1.5">
          Filter by brand (select as many as you need)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {brandCounts.map(({ label, count }) => (
            <button
              key={label}
              onClick={() => toggleBrand(label)}
              className={`pill ${selectedBrands.includes(label) ? "active" : ""}`}
              title={label}
            >
              <span className="inline-block max-w-[200px] truncate align-middle">{label}</span>
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          ))}
        </div>
      </div>

      {!labelsConfigured && (
        <div className="card border-amber-200 bg-amber-50 text-amber-700 text-xs px-3 py-2 mb-4">
          Custom product names aren&apos;t syncing yet — set SUPABASE_URL and
          SUPABASE_SERVICE_ROLE_KEY to enable them.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 min-w-0">
        <div className="card p-2 h-fit md:sticky md:top-28 max-h-[70vh] flex flex-col overflow-hidden">
          <div className="relative p-1.5 pb-2">
            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product…"
              className="w-full text-xs border border-slate-200 rounded-full pl-7 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30"
            />
          </div>
          <div className="overflow-y-auto">
            {visibleGroups.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No matches.</p>
            )}
            {visibleGroups.map((g) => {
              const isActive = g.name === activeProduct;
              const isUnmatched = g.name === NO_ASIN;
              const label = displayName(g.name);
              const hasCustomLabel = label !== g.name;
              return (
                <button
                  key={g.name}
                  onClick={() => {
                    setSelected(g.name);
                    setEditing(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs text-left transition-colors ${
                    isActive ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: isUnmatched ? "#cbd5e1" : colorForKey(g.name) }}
                    />
                    <span className="min-w-0 leading-tight">
                      <span
                        className={`block break-words ${
                          isUnmatched ? "italic text-slate-400" : hasCustomLabel ? "" : "font-mono"
                        }`}
                      >
                        {label}
                      </span>
                      {hasCustomLabel && (
                        <span className="block text-[9px] text-slate-400 font-mono truncate">
                          {g.name}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {g.overdue > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#f5365c] text-white">
                        {g.overdue}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{g.count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          {activeProduct ? (
            <>
              <div className="mb-4">
                {editing ? (
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveLabel();
                        if (e.key === "Escape") setEditing(false);
                      }}
                      placeholder={activeProduct}
                      className="text-sm font-semibold border border-slate-200 rounded-lg px-2.5 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30"
                    />
                    <button
                      onClick={saveLabel}
                      disabled={saving}
                      className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center disabled:opacity-50 shrink-0"
                      title="Save"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
                      title="Cancel"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 group">
                    <span className={`break-words max-w-[520px] ${displayName(activeProduct) === activeProduct ? "font-mono" : ""}`}>
                      {displayName(activeProduct)}
                    </span>
                    {isEditable && (
                      <button
                        onClick={startEditing}
                        title="Rename this product"
                        className="text-slate-300 hover:text-[#7b61ff] shrink-0"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </h2>
                )}
                {!editing && displayName(activeProduct) !== activeProduct && (
                  <p className="text-[11px] text-slate-400 font-mono">{activeProduct}</p>
                )}
                <p className="text-xs text-slate-400">
                  {productIssues.length} open task{productIssues.length === 1 ? "" : "s"}
                  {isEditable && (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={`https://www.amazon.com/dp/${activeProduct}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        view on Amazon
                      </a>
                    </>
                  )}
                </p>
              </div>
              <IssueTable issues={productIssues} />
            </>
          ) : (
            <p className="text-sm text-slate-400 py-10 text-center">
              No products match the selected brand(s).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
