import { useState } from "react";
import { Menu, Search, RefreshCw, Bell, Lock } from "lucide-react";

export default function Topbar({
  onMenuClick,
  pageTitle,
  onRefresh,
  loading,
  fetchedAt,
  overdueCount,
  onSearch,
  onBellClick,
}) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="card px-4 sm:px-5 py-3 mb-6 flex flex-wrap items-center gap-3 justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 shrink-0"
        >
          <Menu size={18} />
        </button>
        <h2 className="text-sm sm:text-base font-semibold text-slate-800 truncate">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch(searchValue);
            }}
            placeholder="Search key or summary, press Enter…"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-full pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30 focus:border-[#7b61ff]/40"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRefresh}
          disabled={loading}
          title={fetchedAt ? `Updated ${new Date(fetchedAt).toLocaleTimeString()}` : "Refresh"}
          className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>

        <button
          onClick={onBellClick}
          title="Jump to overdue tasks"
          className="relative h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
        >
          <Bell size={16} />
          {overdueCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-[#f5365c] text-white text-[10px] leading-4 text-center font-semibold">
              {overdueCount > 99 ? "99+" : overdueCount}
            </span>
          )}
        </button>

        <div
          title="Read-only — no changes are ever written to Jira"
          className="h-9 w-9 rounded-full bg-gradient-to-br from-[#7b61ff] to-[#9c6bff] flex items-center justify-center text-white"
        >
          <Lock size={15} />
        </div>
      </div>
    </div>
  );
}
