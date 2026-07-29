// Shared logic for bucketing/filtering/grouping issues. Used identically by
// the charts (Overview tab) and the tables (All Tasks / Assignee / Client
// tabs) so a chart click always produces the exact filter the table applies.

export const DUE_BUCKET_ORDER = [
  "Overdue",
  "Today",
  "This Week",
  "Next Week",
  "Later",
  "No Due Date",
];

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Monday-based start of week
function startOfWeek(d) {
  const copy = startOfDay(d);
  const day = copy.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function getDueBucket(dueDateStr, now = new Date()) {
  if (!dueDateStr) return "No Due Date";
  const due = startOfDay(new Date(dueDateStr + "T00:00:00"));
  const today = startOfDay(now);

  if (due.getTime() < today.getTime()) return "Overdue";
  if (due.getTime() === today.getTime()) return "Today";

  const endOfThisWeek = addDays(startOfWeek(today), 6);
  if (due.getTime() <= endOfThisWeek.getTime()) return "This Week";

  const endOfNextWeek = addDays(endOfThisWeek, 7);
  if (due.getTime() <= endOfNextWeek.getTime()) return "Next Week";

  return "Later";
}

// Fields a filter can constrain with a single value. `client` is handled
// separately below because it's multi-select (you can pick more than one
// brand at once). `search` matches key/summary substrings.
export const FILTER_FIELDS = [
  "assignee",
  "status",
  "priority",
  "project",
  "issueType",
  "dueBucket",
];

export function emptyFilters() {
  return {
    assignee: "",
    status: "",
    priority: "",
    client: [], // multi-select: array of brand labels, [] = no constraint
    project: "",
    issueType: "",
    dueBucket: "",
    search: "",
  };
}

export function matchesFilters(issue, filters) {
  if (!filters) return true;
  for (const field of FILTER_FIELDS) {
    const val = filters[field];
    if (val && issue[field] !== val) return false;
  }
  if (filters.client && filters.client.length) {
    if (!filters.client.includes(issue.client)) return false;
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    if (q) {
      const hay = `${issue.key} ${issue.summary}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
  }
  return true;
}

export function applyFilters(issues, filters) {
  return issues.filter((i) => matchesFilters(i, filters));
}

// Returns [{ field, value }] for every active constraint. `client` may
// contribute multiple entries (one per selected brand) so each can be
// cleared independently.
export function activeFilterEntries(filters) {
  if (!filters) return [];
  const entries = [];
  for (const field of FILTER_FIELDS) {
    if (filters[field]) entries.push({ field, value: filters[field] });
  }
  for (const brand of filters.client || []) {
    entries.push({ field: "client", value: brand });
  }
  if (filters.search) entries.push({ field: "search", value: filters.search });
  return entries;
}

const FIELD_LABELS = {
  assignee: "Assignee",
  status: "Status",
  priority: "Priority",
  client: "Client",
  project: "Project",
  issueType: "Type",
  dueBucket: "Due",
  search: "Search",
};

export function fieldLabel(field) {
  return FIELD_LABELS[field] || field;
}

// Group issues by a key function into [{ name, count, issues }], sorted by
// count desc (unless `order` is supplied, e.g. for due-date buckets).
export function groupBy(issues, keyFn, order) {
  const map = new Map();
  for (const issue of issues) {
    const key = keyFn(issue) || "Unspecified";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(issue);
  }
  let entries = Array.from(map.entries()).map(([name, items]) => ({
    name,
    count: items.length,
    issues: items,
  }));
  if (order) {
    entries.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  } else {
    entries.sort((a, b) => b.count - a.count);
  }
  return entries;
}

export function uniqueSorted(issues, keyFn) {
  const set = new Set(issues.map((i) => keyFn(i)).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// Whole days between an issue's creation date and now — "how long has this
// been sitting open".
export function daysOpen(createdStr, now = new Date()) {
  if (!createdStr) return null;
  const created = new Date(createdStr);
  if (Number.isNaN(created.getTime())) return null;
  const ms = startOfDay(now).getTime() - startOfDay(created).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
