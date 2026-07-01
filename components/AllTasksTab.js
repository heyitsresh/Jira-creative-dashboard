import { useEffect, useMemo, useState, useCallback } from "react";
import IssueTable from "./IssueTable";
import FilterChips from "./FilterChips";
import FilterSelect from "./FilterSelect";
import { applyFilters, groupBy, uniqueSorted } from "../lib/issueUtils";
import { BRAND_LABELS } from "../lib/clientConfig";

const NOTES_POLL_MS = 20000;

export default function AllTasksTab({
  issues,
  filters,
  onFilterChange,
  onToggleClient,
  onClear,
  onClearAll,
}) {
  const statuses = useMemo(() => uniqueSorted(issues, (i) => i.status), [issues]);
  const priorities = useMemo(() => uniqueSorted(issues, (i) => i.priority), [issues]);
  const assignees = useMemo(() => uniqueSorted(issues, (i) => i.assignee), [issues]);
  const types = useMemo(() => uniqueSorted(issues, (i) => i.issueType), [issues]);
  const byBrand = useMemo(() => groupBy(issues, (i) => i.client), [issues]);
  const brandCounts = useMemo(() => {
    const map = new Map(byBrand.map((b) => [b.name, b.count]));
    return BRAND_LABELS.map((label) => ({ label, count: map.get(label) || 0 }));
  }, [byBrand]);

  const filtered = useMemo(() => applyFilters(issues, filters), [issues, filters]);

  // Shared notes: fetch once for every issue we know about, then poll so
  // notes left by other people (via a shared link) show up without a
  // manual refresh.
  const [notesByKey, setNotesByKey] = useState({});
  const [notesConfigured, setNotesConfigured] = useState(true);

  const issueKeys = useMemo(() => issues.map((i) => i.key), [issues]);

  const loadNotes = useCallback(async () => {
    if (issueKeys.length === 0) return;
    try {
      const resp = await fetch(`/api/notes?issueKeys=${encodeURIComponent(issueKeys.join(","))}`);
      const data = await resp.json();
      if (!resp.ok) return;
      setNotesConfigured(data.configured !== false);
      const map = {};
      for (const note of data.notes || []) {
        if (!map[note.issue_key]) map[note.issue_key] = [];
        map[note.issue_key].push(note);
      }
      setNotesByKey(map);
    } catch {
      // Silent — notes are a nice-to-have layered on top of the Jira data.
    }
  }, [issueKeys]);

  useEffect(() => {
    loadNotes();
    const id = setInterval(loadNotes, NOTES_POLL_MS);
    return () => clearInterval(id);
  }, [loadNotes]);

  async function handleAddNote(issueKey, { body }) {
    const resp = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueKey, body }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Failed to save note.");
    setNotesByKey((prev) => ({
      ...prev,
      [issueKey]: [...(prev[issueKey] || []), data.note],
    }));
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 mb-1.5">
          Brands (select as many as you need)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {brandCounts.map(({ label, count }) => (
            <button
              key={label}
              onClick={() => onToggleClient(label)}
              className={`pill ${filters.client.includes(label) ? "active" : ""}`}
              title={label}
            >
              <span className="inline-block max-w-[200px] truncate align-middle">
                {label}
              </span>
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500 flex-1 min-w-[180px]">
          <span className="font-medium">Search</span>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search key or summary…"
            className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30"
          />
        </label>
        <FilterSelect
          label="Status"
          value={filters.status}
          options={statuses}
          onChange={(v) => onFilterChange("status", v)}
        />
        <FilterSelect
          label="Priority"
          value={filters.priority}
          options={priorities}
          onChange={(v) => onFilterChange("priority", v)}
        />
        <FilterSelect
          label="Assignee"
          value={filters.assignee}
          options={assignees}
          onChange={(v) => onFilterChange("assignee", v)}
        />
        <FilterSelect
          label="Type"
          value={filters.issueType}
          options={types}
          onChange={(v) => onFilterChange("issueType", v)}
        />
      </div>

      <FilterChips filters={filters} onClear={onClear} onClearAll={onClearAll} />

      {!notesConfigured && (
        <div className="card border-amber-200 bg-amber-50 text-amber-700 text-xs px-3 py-2 mb-4">
          Notes aren&apos;t syncing yet — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable shared notes.
        </div>
      )}

      <p className="text-xs text-slate-400 mb-2">
        {filtered.length} of {issues.length} open task{issues.length === 1 ? "" : "s"}
      </p>

      <IssueTable
        issues={filtered}
        notesByKey={notesByKey}
        onAddNote={handleAddNote}
      />
    </div>
  );
}
