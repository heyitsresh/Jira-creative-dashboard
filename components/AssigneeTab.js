import { useMemo, useState } from "react";
import IssueTable from "./IssueTable";
import FilterSelect from "./FilterSelect";
import { groupBy, uniqueSorted } from "../lib/issueUtils";
import { colorForKey } from "../lib/colors";

export default function AssigneeTab({ issues }) {
  const byAssignee = useMemo(() => groupBy(issues, (i) => i.assignee), [issues]);
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");

  const activeAssignee = selected || byAssignee[0]?.name || null;
  const assigneeIssuesAll = useMemo(
    () => issues.filter((i) => i.assignee === activeAssignee),
    [issues, activeAssignee]
  );
  const types = useMemo(
    () => uniqueSorted(assigneeIssuesAll, (i) => i.issueType),
    [assigneeIssuesAll]
  );
  const assigneeIssues = useMemo(
    () =>
      typeFilter
        ? assigneeIssuesAll.filter((i) => i.issueType === typeFilter)
        : assigneeIssuesAll,
    [assigneeIssuesAll, typeFilter]
  );

  if (byAssignee.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No open tasks.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 min-w-0">
      <div className="card p-2 h-fit md:sticky md:top-28 max-h-[70vh] overflow-y-auto">
        {byAssignee.map((a) => {
          const isActive = a.name === activeAssignee;
          return (
            <button
              key={a.name}
              onClick={() => {
                setSelected(a.name);
                setTypeFilter("");
              }}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm text-left transition-colors ${
                isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: colorForKey(a.name) }}
                />
                <span className="truncate">{a.name}</span>
              </span>
              <span className="text-xs text-slate-400 shrink-0">{a.count}</span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800 truncate max-w-[320px]">
              {activeAssignee}
            </h2>
            <p className="text-xs text-slate-400">
              {assigneeIssues.length} of {assigneeIssuesAll.length} open task
              {assigneeIssuesAll.length === 1 ? "" : "s"}
            </p>
          </div>
          <FilterSelect
            label="Task type"
            value={typeFilter}
            options={types}
            onChange={setTypeFilter}
          />
        </div>
        <IssueTable issues={assigneeIssues} hideColumns={["assignee"]} />
      </div>
    </div>
  );
}
