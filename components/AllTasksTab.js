import { useMemo } from "react";
import IssueTable from "./IssueTable";
import FilterChips from "./FilterChips";
import FilterSelect from "./FilterSelect";
import { applyFilters, uniqueSorted } from "../lib/issueUtils";

export default function AllTasksTab({ issues, filters, onFilterChange, onClear, onClearAll }) {
  const clients = useMemo(() => uniqueSorted(issues, (i) => i.client), [issues]);
  const statuses = useMemo(() => uniqueSorted(issues, (i) => i.status), [issues]);
  const priorities = useMemo(() => uniqueSorted(issues, (i) => i.priority), [issues]);
  const assignees = useMemo(() => uniqueSorted(issues, (i) => i.assignee), [issues]);
  const types = useMemo(() => uniqueSorted(issues, (i) => i.issueType), [issues]);

  const filtered = useMemo(() => applyFilters(issues, filters), [issues, filters]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500 flex-1 min-w-[180px]">
          <span className="font-medium">Search</span>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search key or summary…"
            className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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

      {clients.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 mb-1.5">
            Quick filter by client
          </p>
          <div className="flex flex-wrap gap-1.5">
            {clients.map((c) => (
              <button
                key={c}
                onClick={() =>
                  onFilterChange("client", filters.client === c ? "" : c)
                }
                className={`pill ${filters.client === c ? "active" : ""}`}
                title={c}
              >
                <span className="inline-block max-w-[160px] truncate align-middle">
                  {c}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <FilterChips filters={filters} onClear={onClear} onClearAll={onClearAll} />

      <p className="text-xs text-slate-400 mb-2">
        {filtered.length} of {issues.length} open task{issues.length === 1 ? "" : "s"}
      </p>

      <IssueTable issues={filtered} />
    </div>
  );
}
