import { Fragment, useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import { colorForKey, DUE_BUCKET_COLORS } from "../lib/colors";
import { formatDate, getDueBucket } from "../lib/issueUtils";

const ALL_COLUMNS = [
  { key: "key", label: "Key", sortable: true },
  { key: "summary", label: "Summary", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "assignee", label: "Assignee", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "dueDate", label: "Due Date", sortable: true },
  { key: "project", label: "Project", sortable: true },
  { key: "issueType", label: "Type", sortable: true },
  { key: "updated", label: "Updated", sortable: true },
  { key: "linked", label: "Linked Items", sortable: false },
];

function compareValues(a, b, key) {
  const av = a[key];
  const bv = b[key];
  if (key === "dueDate" || key === "updated" || key === "created") {
    const at = av ? new Date(av).getTime() : -Infinity;
    const bt = bv ? new Date(bv).getTime() : -Infinity;
    return at - bt;
  }
  return String(av ?? "").localeCompare(String(bv ?? ""));
}

export default function IssueTable({
  issues,
  hideColumns = [],
  defaultSort = { key: "updated", dir: "desc" },
  emptyMessage = "No open tasks match the current filters.",
}) {
  const [sort, setSort] = useState(defaultSort);
  const [expanded, setExpanded] = useState(new Set());

  const columns = ALL_COLUMNS.filter((c) => !hideColumns.includes(c.key));

  function toggleExpanded(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sorted = useMemo(() => {
    const copy = [...issues];
    copy.sort((a, b) => {
      const cmp = compareValues(a, b, sort.key);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [issues, sort]);

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto max-h-[65vh]">
        <table className="w-full text-sm border-collapse min-w-[860px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={`px-3 py-2 font-semibold whitespace-nowrap ${
                    col.sortable ? "cursor-pointer select-none hover:text-slate-800" : ""
                  }`}
                >
                  {col.label}
                  {sort.key === col.key && (
                    <span className="ml-1">{sort.dir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {sorted.map((issue) => {
              const bucket = getDueBucket(issue.dueDate);
              const hasLinks = issue.linkedItems && issue.linkedItems.length > 0;
              const isOpen = expanded.has(issue.key);
              return (
                <FragmentRow
                  key={issue.key}
                  issue={issue}
                  bucket={bucket}
                  columns={columns}
                  hasLinks={hasLinks}
                  isOpen={isOpen}
                  onToggle={() => hasLinks && toggleExpanded(issue.key)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRow({ issue, bucket, columns, hasLinks, isOpen, onToggle }) {
  const total = issue.linkedItems?.length || 0;
  const done = issue.linkedItems?.filter((l) => l.statusCategory === "Done").length || 0;

  return (
    <Fragment>
      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
        {columns.map((col) => (
          <td key={col.key} className="px-3 py-2 align-top max-w-[260px]">
            {col.key === "linked"
              ? renderLinkedCell({ total, done, hasLinks, isOpen, onToggle })
              : renderCell(col.key, issue, bucket)}
          </td>
        ))}
      </tr>
      {hasLinks && isOpen && (
        <tr className="bg-slate-50/70 border-b border-slate-100">
          <td colSpan={columns.length} className="px-3 py-2">
            <div className="pl-2 border-l-2 border-slate-200 flex flex-col gap-1.5">
              {issue.linkedItems.map((link) => (
                <div
                  key={`${issue.key}-${link.key}`}
                  className="flex items-center gap-2 text-xs flex-wrap"
                >
                  <span className="text-slate-400 whitespace-nowrap">
                    {link.relation}
                  </span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline whitespace-nowrap"
                  >
                    {link.key}
                  </a>
                  <span className="truncate max-w-[280px] text-slate-600" title={link.summary}>
                    {link.summary}
                  </span>
                  <StatusBadge status={link.status} statusCategory={link.statusCategory} />
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function renderLinkedCell({ total, done, hasLinks, isOpen, onToggle }) {
  if (!hasLinks) {
    return <span className="text-xs text-slate-300">—</span>;
  }
  const allDone = done === total;
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
        allDone
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      } hover:brightness-95`}
    >
      {done}/{total} linked done
      <span className="text-[10px]">{isOpen ? "▲" : "▼"}</span>
    </button>
  );
}

function renderCell(key, issue, bucket) {
  switch (key) {
    case "key":
      return (
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline whitespace-nowrap"
        >
          {issue.key}
        </a>
      );
    case "summary":
      return (
        <span className="block truncate max-w-[320px]" title={issue.summary}>
          {issue.summary}
        </span>
      );
    case "status":
      return (
        <StatusBadge status={issue.status} statusCategory={issue.statusCategory} />
      );
    case "assignee":
      return <span className="truncate block max-w-[160px]">{issue.assignee}</span>;
    case "priority":
      return (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: colorForKey(issue.priority) }}
          />
          {issue.priority}
        </span>
      );
    case "client":
      return (
        <span className="truncate block max-w-[180px]" title={issue.client}>
          {issue.client}
        </span>
      );
    case "dueDate":
      return (
        <span
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: DUE_BUCKET_COLORS[bucket] }}
        >
          {formatDate(issue.dueDate)}
        </span>
      );
    case "project":
      return <span className="whitespace-nowrap">{issue.project}</span>;
    case "issueType":
      return <span className="whitespace-nowrap">{issue.issueType}</span>;
    case "updated":
      return (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {formatDate(issue.updated)}
        </span>
      );
    default:
      return issue[key];
  }
}
