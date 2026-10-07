import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SEVERITIES, STATUSES } from "@/lib/constants";
import type { Report } from "@/lib/reports";

const SEVERITY_COLORS: Record<string, string> = {
  Low: "var(--sev-low)",
  Medium: "var(--sev-medium)",
  High: "var(--sev-high)",
  Critical: "var(--sev-critical)",
};

function ChartCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-5">
      <h3 className="font-bold">{title}</h3>
      <p className="mb-4 mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as never}
        </ResponsiveContainer>
      </div>
      {footer}
    </section>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
} as const;

export function StatusChart({ reports }: { reports: Report[] }) {
  const data = STATUSES.map((status) => ({
    name: status,
    value: reports.filter((r) => r.status === status).length,
  }));

  return (
    <ChartCard title="Reports by status" description="Distribution across the review workflow">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} dy={8} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Reports" fill="var(--primary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function SeverityChart({ reports }: { reports: Report[] }) {
  const data = SEVERITIES.map((severity) => ({
    name: severity,
    value: reports.filter((r) => r.severity === severity).length,
  })).filter((d) => d.value > 0);

  if (!data.length) {
    return (
      <section className="surface-card grid place-items-center p-5 text-sm text-muted-foreground">
        No severity data yet.
      </section>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ChartCard
      title="Severity breakdown"
      description="Share of reports per severity level"
      footer={
        <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {data.map((entry) => (
            <li key={entry.name} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: SEVERITY_COLORS[entry.name] }} aria-hidden="true" />
              {entry.name}: {entry.value} ({Math.round((entry.value / total) * 100)}%)
            </li>
          ))}
        </ul>
      }
    >
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ChartCard>
  );
}

export function TrendChart({ reports }: { reports: Report[] }) {
  const days: { name: string; value: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day.getTime() + 86400000);
    days.push({
      name: day.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      value: reports.filter((r) => {
        const at = new Date(r.created_at).getTime();
        return at >= day.getTime() && at < next.getTime();
      }).length,
    });
  }

  return (
    <ChartCard title="Reports over time" description="New submissions in the last 14 days">
      <LineChart data={days} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={1} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="value"
          name="Reports"
          stroke="var(--primary)"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ChartCard>
  );
}

export function LocationChart({ reports }: { reports: Report[] }) {
  const counts = new Map<string, number>();
  reports.forEach((r) => {
    const area = (r.address || "Unspecified location").split(",").pop()!.trim() || "Unspecified";
    counts.set(area, (counts.get(area) ?? 0) + 1);
  });
  const data = [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (!data.length) {
    return (
      <section className="surface-card grid place-items-center p-5 text-sm text-muted-foreground">
        No location data yet.
      </section>
    );
  }

  return (
    <ChartCard title="Top reported areas" description="Most frequent locations from submitted addresses">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Reports" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartCard>
  );
}
