import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { colorForKey } from "../lib/colors";

function truncate(str, n) {
  if (!str) return str;
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

export default function GroupedBarChart({
  title,
  data,
  colorFn,
  onSegmentClick,
  emptyMessage = "No data",
}) {
  const height = Math.max(180, Math.min(420, data.length * 34 + 40));

  return (
    <div className="card p-4 min-w-0">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: colorForKey(title) }}
        />
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          {emptyMessage}
        </p>
      ) : (
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
            >
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => truncate(v, 16)}
              />
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.04)" }}
                formatter={(value) => [value, "Open tasks"]}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                onClick={(entry) => onSegmentClick?.(entry.name)}
                cursor={onSegmentClick ? "pointer" : "default"}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={colorFn(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
