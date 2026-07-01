import { useMemo } from "react";
import { getDueBucket, groupBy, uniqueSorted } from "../lib/issueUtils";
import { resolvePinnedPeople } from "../lib/pinnedPeople";
import { colorForKey } from "../lib/colors";

export default function SummaryBar({ issues, onStatusClick, onPersonClick }) {
  const byStatus = useMemo(() => groupBy(issues, (i) => i.status), [issues]);

  const pinned = useMemo(() => {
    const names = uniqueSorted(issues, (i) => i.assignee);
    return resolvePinnedPeople(names).map((p) => {
      const theirIssues = p.resolvedName
        ? issues.filter((i) => i.assignee === p.resolvedName)
        : [];
      const overdue = theirIssues.filter(
        (i) => getDueBucket(i.dueDate) === "Overdue"
      ).length;
      return { ...p, open: theirIssues.length, overdue };
    });
  }, [issues]);

  return (
    <div className="card px-4 sm:px-5 py-3 mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-2xl font-semibold text-slate-800">{issues.length}</span>
        <span className="text-xs text-slate-500 leading-tight">
          open task{issues.length === 1 ? "" : "s"}
          <br />
          across all brands
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[200px]">
        {byStatus.map((s) => (
          <button
            key={s.name}
            onClick={() => onStatusClick(s.name)}
            className="pill flex items-center gap-1.5"
            title={`Filter MASTER to ${s.name}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: colorForKey(s.name) }}
            />
            {s.name}
            <span className="opacity-60">{s.count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {pinned.map((p) => (
          <button
            key={p.configuredName}
            onClick={() => p.resolvedName && onPersonClick(p.resolvedName)}
            disabled={!p.resolvedName}
            title={
              p.resolvedName
                ? `${p.resolvedName}: ${p.open} open, ${p.overdue} overdue`
                : `No matching assignee found for "${p.configuredName}" yet`
            }
            className="relative flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ backgroundColor: colorForKey(p.resolvedName || p.configuredName) }}
            >
              {p.configuredName.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-xs text-left leading-tight">
              <span className="block font-medium text-slate-700">{p.configuredName}</span>
              <span className="block text-slate-400">{p.open} open</span>
            </span>
            {p.overdue > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[#f5365c] text-white text-[10px] leading-4 text-center font-semibold">
                {p.overdue}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
