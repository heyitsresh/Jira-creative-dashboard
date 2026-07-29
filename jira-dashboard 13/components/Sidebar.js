import { LayoutDashboard, ListChecks, Users, Building2, Package, ChevronLeft, ChevronRight } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "MASTER", icon: ListChecks },
  { id: "assignee", label: "By Assignee", icon: Users },
  { id: "client", label: "By Client", icon: Building2 },
  { id: "product", label: "By Product", icon: Package },
];

export default function Sidebar({ activeTab, onTabChange, open, onClose, collapsed, onToggleCollapsed }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 lg:top-4 left-0 h-screen lg:h-[calc(100vh-2rem)] shrink-0 z-40 transition-[transform,width] duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="card-dark h-full lg:my-0 m-4 flex flex-col p-4 overflow-hidden relative">
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex absolute -right-3 top-8 h-6 w-6 rounded-full bg-[#1b1b2e] border border-white/10 items-center justify-center text-slate-300 hover:text-white hover:bg-[#26264a] z-50"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>

          <div className={`flex items-center gap-2 px-2 py-2 mb-4 ${collapsed ? "justify-center px-0" : ""}`}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#7b61ff] to-[#9c6bff] flex items-center justify-center text-white text-base font-bold shrink-0">
              J
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  Jira Dashboard
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  ave7.atlassian.net
                </p>
              </div>
            )}
          </div>

          <nav className="flex flex-col gap-1 overflow-y-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    onClose?.();
                  }}
                  title={collapsed ? tab.label : undefined}
                  className={`nav-item-dark ${isActive ? "active" : ""} ${
                    collapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <Icon size={17} strokeWidth={2.25} className="shrink-0" />
                  {!collapsed && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="mt-auto pt-4 px-2 text-[11px] text-slate-500 leading-relaxed">
              Read-only — nothing here ever writes back to Jira.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
