import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import IssueTable from "./IssueTable";
import { getDueBucket, groupBy } from "../lib/issueUtils";
import { colorForKey } from "../lib/colors";

const NO_ASIN = "No ASIN Detected";

export default function ProductTab({ issues }) {
  const byProduct = useMemo(() => {
    const groups = groupBy(issues, (i) => i.asin || NO_ASIN);
    return groups.map((g) => ({
      ...g,
      overdue: g.issues.filter((i) => getDueBucket(i.dueDate) === "Overdue").length,
    }));
  }, [issues]);

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const activeProduct = selected || byProduct[0]?.name || null;
  const productIssues = useMemo(
    () => issues.filter((i) => (i.asin || NO_ASIN) === activeProduct),
    [issues, activeProduct]
  );

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return byProduct;
    return byProduct.filter((g) => g.name.toLowerCase().includes(q));
  }, [byProduct, search]);

  if (byProduct.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No open tasks.</p>;
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        Grouped by ASIN pulled from each task's title — tasks whose title doesn't contain a
        recognizable ASIN land under &ldquo;{NO_ASIN}&rdquo;. Edit{" "}
        <code className="bg-slate-100 px-1 py-0.5 rounded">lib/asin.js</code> if your titles use a
        different pattern.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 min-w-0">
        <div className="card p-2 h-fit md:sticky md:top-28 max-h-[70vh] flex flex-col overflow-hidden">
          <div className="relative p-1.5 pb-2">
            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ASIN…"
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
              return (
                <button
                  key={g.name}
                  onClick={() => setSelected(g.name)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm text-left transition-colors ${
                    isActive ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: isUnmatched ? "#cbd5e1" : colorForKey(g.name) }}
                    />
                    <span className={`truncate ${isUnmatched ? "italic text-slate-400" : "font-mono"}`}>
                      {g.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {g.overdue > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#f5365c] text-white">
                        {g.overdue}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{g.count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-800 truncate max-w-[420px] font-mono">
              {activeProduct}
            </h2>
            <p className="text-xs text-slate-400">
              {productIssues.length} open task{productIssues.length === 1 ? "" : "s"}
              {activeProduct !== NO_ASIN && (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={`https://www.amazon.com/dp/${activeProduct}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    view on Amazon
                  </a>
                </>
              )}
            </p>
          </div>
          <IssueTable issues={productIssues} />
        </div>
      </div>
    </div>
  );
}
