import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SummaryBar from "./SummaryBar";

const COLLAPSE_KEY = "jira-dashboard-sidebar-collapsed";

const TAB_TITLES = {
  overview: "Overview",
  tasks: "MASTER",
  assignee: "By Assignee",
  client: "By Client",
  product: "By Product",
};

export default function Layout({
  activeTab,
  onTabChange,
  issues,
  onRefresh,
  loading,
  fetchedAt,
  overdueCount = 0,
  onSearch,
  onBellClick,
  onStatusClick,
  onPersonClick,
  children,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(COLLAPSE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#eef0f8] text-slate-900 flex overflow-x-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 min-w-0">
          <Topbar
            onMenuClick={() => setMobileNavOpen(true)}
            pageTitle={TAB_TITLES[activeTab] || "Dashboard"}
            onRefresh={onRefresh}
            loading={loading}
            fetchedAt={fetchedAt}
            overdueCount={overdueCount}
            onSearch={onSearch}
            onBellClick={onBellClick}
          />
          <SummaryBar
            issues={issues}
            onStatusClick={onStatusClick}
            onPersonClick={onPersonClick}
          />
          {children}
        </main>

        <footer className="text-center text-[11px] text-slate-400 py-4">
          Read-only dashboard — no changes are ever written back to Jira.
        </footer>
      </div>
    </div>
  );
}
