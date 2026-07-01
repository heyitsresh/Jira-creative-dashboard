import { useMemo, useState } from "react";
import { Layers, AlertTriangle, Users2 } from "lucide-react";
import IssueTable from "./IssueTable";
import GroupedBarChart from "./GroupedBarChart";
import StatCard from "./StatCard";
import { getDueBucket, groupBy } from "../lib/issueUtils";
import { colorForKey, GRADIENTS } from "../lib/colors";

export default function ClientTab({ issues }) {
  const byClient = useMemo(() => groupBy(issues, (i) => i.client), [issues]);
  const [selected, setSelected] = useState(null);

  const activeClient = selected || byClient[0]?.name || null;
  const clientIssues = useMemo(
    () => issues.filter((i) => i.client === activeClient),
    [issues, activeClient]
  );

  const byStatus = useMemo(() => groupBy(clientIssues, (i) => i.status), [clientIssues]);
  const byAssignee = useMemo(
    () => groupBy(clientIssues, (i) => i.assignee),
    [clientIssues]
  );
  const overdueCount = useMemo(
    () => clientIssues.filter((i) => getDueBucket(i.dueDate) === "Overdue").length,
    [clientIssues]
  );

  if (byClient.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No open tasks.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {byClient.map((c) => (
          <button
            key={c.name}
            onClick={() => setSelected(c.name)}
            className={`pill ${c.name === activeClient ? "active" : ""}`}
            title={c.name}
          >
            <span className="inline-block max-w-[180px] truncate align-middle">
              {c.name}
            </span>
            <span className="ml-1 opacity-70">({c.count})</span>
          </button>
        ))}
      </div>

      <h2 className="text-base font-semibold text-slate-800 mb-3 truncate">
        {activeClient}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Open tasks"
          value={clientIssues.length}
          icon={Layers}
          gradient={GRADIENTS.violet}
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          gradient={GRADIENTS.red}
        />
        <StatCard
          label="Assignees involved"
          value={byAssignee.length}
          icon={Users2}
          gradient={GRADIENTS.cyan}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GroupedBarChart
          title="By Status"
          data={byStatus}
          colorFn={colorForKey}
        />
        <GroupedBarChart
          title="By Assignee"
          data={byAssignee}
          colorFn={colorForKey}
        />
      </div>

      <IssueTable issues={clientIssues} hideColumns={["client"]} />
    </div>
  );
}
