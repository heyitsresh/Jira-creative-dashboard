import { useMemo } from "react";
import { Layers, AlertTriangle, Clock3, UserX } from "lucide-react";
import GroupedBarChart from "./GroupedBarChart";
import StatCard from "./StatCard";
import { colorForKey, DUE_BUCKET_COLORS, GRADIENTS } from "../lib/colors";
import { DUE_BUCKET_ORDER, getDueBucket, groupBy } from "../lib/issueUtils";

export default function OverviewTab({ issues, onDrill }) {
  const byAssignee = useMemo(
    () => groupBy(issues, (i) => i.assignee),
    [issues]
  );
  const byStatus = useMemo(() => groupBy(issues, (i) => i.status), [issues]);
  const byPriority = useMemo(
    () => groupBy(issues, (i) => i.priority),
    [issues]
  );
  const byClient = useMemo(() => groupBy(issues, (i) => i.client), [issues]);
  const byDueBucket = useMemo(
    () =>
      groupBy(issues, (i) => getDueBucket(i.dueDate), DUE_BUCKET_ORDER),
    [issues]
  );

  const overdueCount =
    byDueBucket.find((d) => d.name === "Overdue")?.count || 0;
  const dueTodayCount = byDueBucket.find((d) => d.name === "Today")?.count || 0;
  const unassignedCount =
    byAssignee.find((a) => a.name === "Unassigned")?.count || 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Open tasks"
          value={issues.length}
          icon={Layers}
          gradient={GRADIENTS.violet}
          caption="Across all tracked projects"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          gradient={GRADIENTS.red}
          caption="Past their due date"
        />
        <StatCard
          label="Due today"
          value={dueTodayCount}
          icon={Clock3}
          gradient={GRADIENTS.orange}
          caption="Wrapping up today"
        />
        <StatCard
          label="Unassigned"
          value={unassignedCount}
          icon={UserX}
          gradient={GRADIENTS.cyan}
          caption="Nobody's on these yet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupedBarChart
          title="By Assignee"
          data={byAssignee}
          colorFn={colorForKey}
          onSegmentClick={(name) => onDrill("assignee", name)}
        />
        <GroupedBarChart
          title="By Status"
          data={byStatus}
          colorFn={colorForKey}
          onSegmentClick={(name) => onDrill("status", name)}
        />
        <GroupedBarChart
          title="By Priority"
          data={byPriority}
          colorFn={colorForKey}
          onSegmentClick={(name) => onDrill("priority", name)}
        />
        <GroupedBarChart
          title="By Client"
          data={byClient}
          colorFn={colorForKey}
          onSegmentClick={(name) => onDrill("client", name)}
        />
        <GroupedBarChart
          title="By Due Date"
          data={byDueBucket}
          colorFn={(name) => DUE_BUCKET_COLORS[name] || colorForKey(name)}
          onSegmentClick={(name) => onDrill("dueBucket", name)}
        />
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Click any bar to jump to All Tasks filtered to that segment.
      </p>
    </div>
  );
}
