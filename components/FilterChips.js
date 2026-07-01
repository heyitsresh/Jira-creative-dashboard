import { activeFilterEntries, fieldLabel } from "../lib/issueUtils";

export default function FilterChips({ filters, onClear, onClearAll }) {
  const entries = activeFilterEntries(filters);
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-slate-500 font-medium">Filters:</span>
      {entries.map(({ field, value }) => (
        <span key={`${field}-${value}`} className="chip">
          <span className="truncate max-w-[180px]">
            {fieldLabel(field)}: {value}
          </span>
          <button
            onClick={() => onClear(field, value)}
            className="text-[#5e40e0] hover:text-red-600 font-semibold leading-none"
            aria-label={`Clear ${field} filter`}
          >
            ×
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 ml-1"
      >
        Clear all
      </button>
    </div>
  );
}
