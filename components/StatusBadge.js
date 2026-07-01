import { colorForKey } from "../lib/colors";

const CATEGORY_STYLE = {
  "To Do": "bg-slate-100 text-slate-700 border-slate-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function StatusBadge({ status, statusCategory }) {
  const style =
    CATEGORY_STYLE[statusCategory] ||
    "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${style} whitespace-nowrap`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: colorForKey(status) }}
      />
      <span className="truncate max-w-[140px]">{status}</span>
    </span>
  );
}
