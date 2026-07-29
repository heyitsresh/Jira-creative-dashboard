import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import IssueTable from "./IssueTable";
import { getDueBucket, groupBy } from "../lib/issueUtils";
import { colorForKey } from "../lib/colors";
import { BRAND_LABELS } from "../lib/clientConfig";

const NO_ASIN = "No ASIN Detected";
const POLL_MS = 20000;
const REAL_ASIN_RE = /^B0[A-Z0-9]{8}$/i;

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
  const [saveError, setSaveError] = useState(null);

  // Manual per-task reassignment (drag a task onto a different product),
  // also shared via Supabase.
  const [overrides, setOverrides] = useState({});
  const [overridesConfigured, setOverridesConfigured] = useState(true);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const [dropError, setDropError] = useState(null);

  // Manually-created lists (e.g. "Holiday Bundle"), each optionally linked
  // to a real ASIN so matching tasks auto-join without dragging.
  const [customLists, setCustomLists] = useState([]); // [{ name, asin }]
  const [listsConfigured, setListsConfigured] = useState(true);
  const [newListName, setNewListName] = useState("");
  const [newListAsin, setNewListAsin] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [listError, setListError] = useState(null);

  // Editing the ASIN linked to whichever custom list is currently open.
  const [editingAsin, setEditingAsin] = useState(false);
  const [asinInputValue, setAsinInputValue] = useState("");
  const [asinSaving, setAsinSaving] = useState(false);
  const [asinSaveError, setAsinSaveError] = useState(null);

  const loadLabels = useCallback(async () => {
    try {
      const resp = await fetch("/api/asin-labels");
      const data = await resp.json();
      if (!resp.ok) {
        setLabelsConfigured(false);
        return;
      }
      setLabelsConfigured(data.configured !== false);
      const map = {};
      for (const o of data.overrides || []) map[o.asin] = o.label;
      setLabels(map);
    } catch {
      setLabelsConfigured(false);
    }
  }, []);

  const loadOverrides = useCallback(async () => {
    try {
      const resp = await fetch("/api/asin-overrides");
      const data = await resp.json();
      if (!resp.ok) {
        setOverridesConfigured(false);
        return;
      }
      setOverridesConfigured(data.configured !== false);
      const map = {};
      for (const o of data.overrides || []) map[o.issue_key] = o.asin;
      setOverrides(map);
    } catch {
      setOverridesConfigured(false);
    }
  }, []);

  const loadCustomLists = useCallback(async () => {
    try {
      const resp = await fetch("/api/product-lists");
      const data = await resp.json();
      if (!resp.ok) {
        setListsConfigured(false);
        return;
      }
      setListsConfigured(data.configured !== false);
      setCustomLists((data.lists || []).map((l) => ({ name: l.name, asin: l.asin || null })));
    } catch {
      setListsConfigured(false);
    }
  }, []);

  useEffect(() => {
    loadLabels();
    loadOverrides();
    loadCustomLists();
    const id = setInterval(() => {
      loadLabels();
      loadOverrides();
      loadCustomLists();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadLabels, loadOverrides, loadCustomLists]);

  function displayName(rawAsin) {
    return labels[rawAsin] || rawAsin;
  }

  // A custom list can claim a real ASIN so tasks with it auto-join —
  // without this, only manually-dragged tasks would ever land there.
  const customAsinMap = useMemo(() => {
    const map = {};
    for (const l of customLists) {
      if (l.asin) map[l.asin.toUpperCase()] = l.name;
    }
    return map;
  }, [customLists]);

  // Priority: an explicit per-task drag override wins, then a custom
  // list's linked ASIN, then whatever was auto-detected from the title.
  const effectiveIssues = useMemo(
    () =>
      issues.map((i) => {
        if (overrides[i.key]) return { ...i, asin: overrides[i.key] };
        if (i.asin && customAsinMap[i.asin]) return { ...i, asin: customAsinMap[i.asin] };
        return i;
      }),
    [issues, overrides, customAsinMap]
  );

  const brandCounts = useMemo(() => {
    const byBrand = groupBy(effectiveIssues, (i) => i.client);
    const map = new Map(byBrand.map((b) => [b.name, b.count]));
    return BRAND_LABELS.map((label) => ({ label, count: map.get(label) || 0 }));
  }, [effectiveIssues]);

  const brandFilteredIssues = useMemo(
    () =>
      selectedBrands.length
        ? effectiveIssues.filter((i) => selectedBrands.includes(i.client))
        : effectiveIssues,
    [effectiveIssues, selectedBrands]
  );

  const byProduct = useMemo(() => {
    const groups = groupBy(brandFilteredIssues, (i) => i.asin || NO_ASIN);
    const withOverdue = groups.map((g) => ({
      ...g,
      overdue: g.issues.filter((i) => getDueBucket(i.dueDate) === "Overdue").length,
      isCustom: customLists.some((l) => l.name === g.name),
    }));
    if (selectedBrands.length > 0) {
      // A brand filter is active — a custom list should only show up if it
      // actually has a task for that brand, same as any detected group.
      return withOverdue;
    }
    // No brand filter — always show every custom list, even empty, so
    // there's somewhere to drag a stray task regardless of brand.
    const present = new Set(withOverdue.map((g) => g.name));
    const emptyCustom = customLists
      .filter((l) => !present.has(l.name))
      .map((l) => ({ name: l.name, count: 0, issues: [], overdue: 0, isCustom: true }));
    return [...withOverdue, ...emptyCustom];
  }, [brandFilteredIssues, customLists, selectedBrands]);

  useEffect(() => {
    if (selected && !byProduct.some((g) => g.name === selected)) {
      setSelected(null);
    }
  }, [byProduct, selected]);

  const activeProduct = selected || byProduct[0]?.name || null;
  const activeListMeta = customLists.find((l) => l.name === activeProduct) || null;
  const isCustomActive = Boolean(activeListMeta);

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

  function selectGroup(name) {
    setSelected(name);
    setEditing(false);
    setEditingAsin(false);
  }

  function startEditing() {
    setEditValue(labels[activeProduct] || "");
    setSaveError(null);
    setEditing(true);
  }

  async function saveLabel() {
    setSaving(true);
    setSaveError(null);
    try {
      const resp = await fetch("/api/asin-labels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: activeProduct, label: editValue.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to save.");
      setLabels((prev) => {
        const next = { ...prev };
        if (editValue.trim()) next[activeProduct] = editValue.trim();
        else delete next[activeProduct];
        return next;
      });
      setEditing(false);
    } catch (err) {
      setSaveError(String(err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  function startEditingAsin() {
    setAsinInputValue(activeListMeta?.asin || "");
    setAsinSaveError(null);
    setEditingAsin(true);
  }

  async function saveAsin() {
    setAsinSaving(true);
    setAsinSaveError(null);
    try {
      const resp = await fetch("/api/product-lists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: activeProduct, asin: asinInputValue.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to save.");
      const savedAsin = data.list?.asin ?? (asinInputValue.trim().toUpperCase() || null);
      setCustomLists((prev) =>
        prev.map((l) => (l.name === activeProduct ? { ...l, asin: savedAsin } : l))
      );
      setEditingAsin(false);
    } catch (err) {
      setAsinSaveError(String(err?.message || err));
    } finally {
      setAsinSaving(false);
    }
  }

  async function handleDrop(targetAsin, issueKey) {
    setDragOverGroup(null);
    if (!issueKey) return;
    const currentIssue = issues.find((i) => i.key === issueKey);
    if (!currentIssue) return;
    const currentEffective = overrides[issueKey] || currentIssue.asin || NO_ASIN;
    if (currentEffective === targetAsin) return;

    const prevOverride = overrides[issueKey];
    // Optimistic update so the drag feels instant. Always sets an explicit
    // override (even for "No ASIN Detected") so it actually sticks rather
    // than snapping back to whatever the title auto-detects.
    setOverrides((prev) => ({ ...prev, [issueKey]: targetAsin }));

    try {
      const resp = await fetch("/api/asin-overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueKey, asin: targetAsin }),
      });
      if (!resp.ok) throw new Error((await resp.json())?.error || "Failed to move task.");
      setDropError(null);
    } catch (err) {
      setOverrides((prev) => {
        const next = { ...prev };
        if (prevOverride) next[issueKey] = prevOverride;
        else delete next[issueKey];
        return next;
      });
      setDropError(String(err?.message || err));
    }
  }

  async function createList() {
    const name = newListName.trim();
    if (!name) return;
    const dupe = byProduct.some((g) => g.name.toLowerCase() === name.toLowerCase());
    if (dupe) {
      setListError("A list with that name already exists.");
      return;
    }
    setCreatingList(true);
    setListError(null);
    try {
      const resp = await fetch("/api/product-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, asin: newListAsin.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to create list.");
      const saved = data.list || { name, asin: newListAsin.trim().toUpperCase() || null };
      setCustomLists((prev) =>
        prev.some((l) => l.name === saved.name) ? prev : [...prev, saved]
      );
      setNewListName("");
      setNewListAsin("");
      setSelected(saved.name);
    } catch (err) {
      setListError(String(err?.message || err));
    } finally {
      setCreatingList(false);
    }
  }

  // Works for both kinds of sidebar entries: a custom list gets deleted
  // outright; a detected-ASIN group instead has every one of its current
  // tasks force-moved to "No ASIN Detected" (there's nothing to "delete" —
  // the group only exists because of what's in the title — but this gives
  // you a way to clear it out).
  async function dissolveGroup(g) {
    if (!g || g.name === NO_ASIN) return;
    const label = displayName(g.name);
    const confirmMsg = g.isCustom
      ? `Delete "${label}"? Any tasks in it move back to their auto-detected group.`
      : `Move all ${g.count} task${g.count === 1 ? "" : "s"} out of "${label}" into "${NO_ASIN}"? They'll stay there until you drag them elsewhere, even if their Jira title still mentions this ASIN.`;
    if (typeof window !== "undefined" && !window.confirm(confirmMsg)) return;
    setListError(null);

    if (g.isCustom) {
      try {
        const resp = await fetch(`/api/product-lists?name=${encodeURIComponent(g.name)}`, {
          method: "DELETE",
        });
        if (!resp.ok) throw new Error((await resp.json())?.error || "Failed to delete list.");
        setCustomLists((prev) => prev.filter((l) => l.name !== g.name));
        setOverrides((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) if (next[key] === g.name) delete next[key];
          return next;
        });
        if (selected === g.name) setSelected(null);
      } catch (err) {
        setListError(String(err?.message || err));
      }
      return;
    }

    const targets = g.issues.map((i) => i.key);
    const prevOverrides = {};
    for (const key of targets) prevOverrides[key] = overrides[key];
    setOverrides((prev) => {
      const next = { ...prev };
      for (const key of targets) next[key] = NO_ASIN;
      return next;
    });
    try {
      const results = await Promise.all(
        targets.map((issueKey) =>
          fetch("/api/asin-overrides", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ issueKey, asin: NO_ASIN }),
          })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error("Some tasks couldn't be moved.");
      if (selected === g.name) setSelected(null);
    } catch (err) {
      setOverrides((prev) => {
        const next = { ...prev };
        for (const key of targets) {
          if (prevOverrides[key]) next[key] = prevOverrides[key];
          else delete next[key];
        }
        return next;
      });
      setListError(String(err?.message || err));
    }
  }

  if (issues.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No open tasks.</p>;
  }

  // What ASIN (if any) this group should link to Amazon with: itself, if
  // it's a real detected ASIN, or whatever ASIN a custom list has linked.
  const linkedAsin = isCustomActive ? activeListMeta?.asin : activeProduct;
  const isRealAsin = Boolean(linkedAsin && REAL_ASIN_RE.test(linkedAsin));
  const dragConfigured = overridesConfigured;

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        Grouped by ASIN pulled from each task's title — tasks whose title doesn't contain a
        recognizable ASIN land under &ldquo;{NO_ASIN}&rdquo;. Edit{" "}
        <code className="bg-slate-100 px-1 py-0.5 rounded">lib/asin.js</code> if your titles use a
        different pattern. Click the pencil next to a product's heading to rename it, drag a task
        from the table onto a different product in the sidebar to reassign it, or hover a sidebar
        entry to clear it out. You can also create your own lists and optionally link them to a
        real ASIN, so matching tasks join automatically.
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

      {(!labelsConfigured || !overridesConfigured || !listsConfigured) && (
        <div className="card border-amber-200 bg-amber-50 text-amber-700 text-xs px-3 py-2 mb-4">
          Custom product names, custom lists, and drag-to-reassign aren&apos;t syncing yet — set
          SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and make sure the asin_labels,
          asin_overrides, and product_lists (with its asin column) tables exist.
        </div>
      )}
      {dropError && (
        <div className="card border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2 mb-4">
          Couldn&apos;t move that task: {dropError}
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
              const isDropTarget = dragConfigured && dragOverGroup === g.name;
              const meta = customLists.find((l) => l.name === g.name);
              return (
                <div
                  key={g.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectGroup(g.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") selectGroup(g.name);
                  }}
                  onDragOver={(e) => {
                    if (!dragConfigured) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={() => dragConfigured && setDragOverGroup(g.name)}
                  onDragLeave={() =>
                    setDragOverGroup((prev) => (prev === g.name ? null : prev))
                  }
                  onDrop={(e) => {
                    if (!dragConfigured) return;
                    e.preventDefault();
                    const issueKey = e.dataTransfer.getData("text/plain");
                    handleDrop(g.name, issueKey);
                  }}
                  className={`group/row w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs text-left transition-colors cursor-pointer ${
                    isDropTarget
                      ? "bg-[#7b61ff]/10 ring-2 ring-[#7b61ff]/40"
                      : isActive
                      ? "bg-violet-50 text-violet-700"
                      : "hover:bg-slate-50 text-slate-700"
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
                      {g.isCustom && meta?.asin && (
                        <span className="block text-[9px] text-slate-400 font-mono truncate">
                          {meta.asin}
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
                    {!isUnmatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dissolveGroup(g);
                        }}
                        title={g.isCustom ? "Delete this list" : "Move these tasks to No ASIN Detected"}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-1.5 pt-2 border-t border-slate-100 mt-1 space-y-1.5">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createList();
              }}
              placeholder="New list name…"
              disabled={!listsConfigured}
              className="w-full text-xs border border-slate-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30 disabled:opacity-50"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newListAsin}
                onChange={(e) => setNewListAsin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createList();
                }}
                placeholder="Linked ASIN (optional)"
                disabled={!listsConfigured}
                className="w-full text-xs font-mono border border-slate-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30 disabled:opacity-50"
              />
              <button
                onClick={createList}
                disabled={!listsConfigured || creatingList || !newListName.trim()}
                title="Create list"
                className="h-7 w-7 rounded-full bg-[#7b61ff] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>
            {listError && <p className="text-[11px] text-red-500 mt-1 px-1">{listError}</p>}
          </div>
        </div>

        <div className="min-w-0">
          {activeProduct ? (
            <>
              <div className="mb-4">
                {editing ? (
                  <div>
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
                    {saveError && (
                      <p className="text-[11px] text-red-500 mt-1">
                        Couldn&apos;t save: {saveError}
                      </p>
                    )}
                  </div>
                ) : (
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 group">
                    <span className={`break-words max-w-[520px] ${displayName(activeProduct) === activeProduct ? "font-mono" : ""}`}>
                      {displayName(activeProduct)}
                    </span>
                    <button
                      onClick={startEditing}
                      title="Rename this product"
                      className="text-slate-300 hover:text-[#7b61ff] shrink-0"
                    >
                      <Pencil size={14} />
                    </button>
                  </h2>
                )}
                {!editing && displayName(activeProduct) !== activeProduct && (
                  <p className="text-[11px] text-slate-400 font-mono">{activeProduct}</p>
                )}
                <p className="text-xs text-slate-400">
                  {productIssues.length} open task{productIssues.length === 1 ? "" : "s"}
                  {isRealAsin && (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={`https://www.amazon.com/dp/${linkedAsin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        view on Amazon
                      </a>
                    </>
                  )}
                  {dragConfigured && (
                    <span className="text-slate-300"> · drag rows onto a sidebar product to move them</span>
                  )}
                </p>
                {isCustomActive && (
                  <div className="mt-1.5">
                    {editingAsin ? (
                      <div className="flex items-center gap-2 max-w-xs">
                        <input
                          autoFocus
                          type="text"
                          value={asinInputValue}
                          onChange={(e) => setAsinInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveAsin();
                            if (e.key === "Escape") setEditingAsin(false);
                          }}
                          placeholder="e.g. B0D1234567"
                          className="text-xs font-mono border border-slate-200 rounded-md px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30"
                        />
                        <button
                          onClick={saveAsin}
                          disabled={asinSaving}
                          className="h-6 w-6 rounded-md bg-emerald-500 text-white flex items-center justify-center disabled:opacity-50 shrink-0"
                          title="Save"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingAsin(false)}
                          className="h-6 w-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : activeListMeta?.asin ? (
                      <p className="text-[11px]">
                        <span className="text-slate-400">Linked ASIN: </span>
                        <span className="font-mono text-slate-600">{activeListMeta.asin}</span>{" "}
                        <button onClick={startEditingAsin} className="text-indigo-600 hover:underline">
                          edit
                        </button>
                      </p>
                    ) : (
                      <button
                        onClick={startEditingAsin}
                        className="text-[11px] text-indigo-600 hover:underline"
                      >
                        + Link an ASIN — tasks with it will auto-join this list
                      </button>
                    )}
                    {asinSaveError && (
                      <p className="text-[11px] text-red-500 mt-1">
                        Couldn&apos;t save: {asinSaveError}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <IssueTable issues={productIssues} draggable={dragConfigured} />
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
