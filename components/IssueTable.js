import { Fragment, useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import NotesSection from "./NotesSection";
import { colorForKey, DUE_BUCKET_COLORS } from "../lib/colors";
import { formatDate, getDueBucket } from "../lib/issueUtils";

// "key" and "notes" are pinned to the left edge (see STICKY_COLUMNS below)
// so they're always visible regardless of horizontal scroll position.
const ALL_COLUMNS = [
  { key: "key", label: "Key", sortable: true },
  { key: "notes", label: "Notes", sortable: false },
  { key: "summary", label: "Summary", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "assignee", label: "Assignee", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "issueType", label: "Type", sortable: true },
  { key: "daysOpen", label: "Days Running", sortable: true },
  { key: "dueDate", label: "Due Date", sortable: true },
  { key: "project", label: "Project", sortable: true },
  { key: "updated", label: "Updated", sortable: true },
  { key: "linked", label: "Linked Items", sortable: false },
];

// Pixel widths used both to size the pinned columns and to compute each
// one's `left` offset so they stack correctly.
const STICKY_WIDTHS = { key: 100, notes: 120 };

function stickyOffset(colKey) {
  if (colKey === "key") return 0;
  if (colKey === "notes") return STICKY_WIDTHS.key;
  return null;
}

function stickyCellProps(colKey, { header = false } = {}) {
  const offset = stickyOffset(colKey);
  if (offset === null) return {};
  const width = STICKY_WIDTHS[colKey];
  const isEdge = colKey === "notes"; // last pinned column gets the divider shadow
  return {
    style: { left: offset, width, minWidth: width, maxWidth: width },
    className: `sticky ${header ? "z-20" : "z-10"} ${header ? "bg-[#f8f9fb]" : "bg-white"} ${
      isEdge ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]" : ""
    }`,
  };
}

function compareValues(a, b, key) {
  const av = a[key];
  const bv = b[key];
  if (key === "dueDate" || key === "updated" || key === "created") {
    const at = av ? new Date(av).getTime() : -Infinity;
    const bt = bv ? new Date(bv).getTime() : -Infinity;
    return at - bt;
  }
  if (key === "daysOpen") {
    return (av ?? -1) - (bv ?? -1);
  }
  return String(av ?? "").localeCompare(String(bv ?? ""));
}

export default function IssueTable({
  issues,
  hideColumns = [],
  defaultSort = { key: "updated", dir: "desc" },
  emptyMessage = "No open tasks match the current filters.",
  notesByKey = null, // { [issueKey]: Note[] } — pass to enable the Notes column
  onAddNote = null, // (issueKey, { author, body }) => Promise
}) {
  const [sort, setSort] = useState(defaultSort);
  const [expanded, setExpanded] = useState(new Set());

  const notesEnabled = Boolean(notesByKey && onAddNote);
  const columns = ALL_COLUMNS.filter((c) => {
    if (hideColumns.includes(c.key)) return false;
    if (c.key === "notes" && !notesEnabled) return false;
    return true;
  });

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
        <table className="w-full text-sm border-collapse min-w-[960px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              {columns.map((col) => {
                const sticky = stickyCellProps(col.key, { header: true });
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    style={sticky.style}
                    className={`px-3 py-2 font-semibold whitespace-nowrap ${
                      col.sortable ? "cursor-pointer select-none hover:text-slate-800" : ""
                    } ${sticky.className || ""}`}
                  >
                    {col.label}
                    {sort.key === col.key && (
                      <span className="ml-1">{sort.dir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                );
              })}
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
              const notes = notesEnabled ? notesByKey[issue.key] || [] : [];
              const canExpand = hasLinks || notesEnabled;
              const isOpen = expanded.has(issue.key);
              return (
                <FragmentRow
                  key={issue.key}
                  issue={issue}
                  bucket={bucket}
                  columns={columns}
                  hasLinks={hasLinks}
                  notesEnabled={notesEnabled}
                  notes={notes}
                  onAddNote={onAddNote}
                  isOpen={isOpen}
                  onToggle={() => canExpand && toggleExpanded(issue.key)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRow({
  issue,
  bucket,
  columns,
  hasLinks,
  notesEnabled,
  notes,
  onAddNote,
  isOpen,
  onToggle,
}) {
  const total = issue.linkedItems?.length || 0;
  const done = issue.linkedItems?.filter((l) => l.statusCategory === "Done").length || 0;
  const canExpand = hasLinks || notesEnabled;

  return (
    <Fragment>
      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
        {columns.map((col) => {
          const sticky = stickyCellProps(col.key);
          return (
            <td
              key={col.key}
              style={sticky.style}
              className={`px-3 py-2 align-top max-w-[260px] ${sticky.className || ""}`}
            >
              {col.key === "linked" &&
                renderLinkedCell({ total, done, hasLinks, isOpen, onToggle })}
              {col.key === "notes" &&
                renderNotesCell({ count: notes.length, isOpen, onToggle })}
              {col.key !== "linked" && col.key !== "notes" &&
                renderCell(col.key, issue, bucket)}
            </td>
          );
        })}
      </tr>
      {canExpand && isOpen && (
        <tr className="bg-slate-50/70 border-b border-slate-100">
          <td colSpan={columns.length} className="px-3 py-3">
            <div className="flex flex-col lg:flex-row gap-4">
              {hasLinks && (
                <div className="flex-1 min-w-0 pl-2 border-l-2 border-slate-200 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                    Linked Items
                  </p>
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
              )}
              {notesEnabled && (
                <div className="flex-1 min-w-0 pl-2 border-l-2 border-slate-200">
                  <NotesSection issueKey={issue.key} notes={notes} onAddNote={onAddNote} />
                </div>
              )}
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

function renderNotesCell({ count, isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
        count > 0
          ? "bg-violet-50 text-violet-700 border-violet-200"
          : "bg-slate-50 text-slate-400 border-slate-200"
      } hover:brightness-95`}
    >
      {count} note{count === 1 ? "" : "s"}
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
    case "daysOpen":
      return (
        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
          {issue.daysOpen ?? "—"}
          {issue.daysOpen !== null && issue.daysOpen !== undefined ? " d" : ""}
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
