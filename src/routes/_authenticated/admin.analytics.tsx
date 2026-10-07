import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  LocationChart,
  SeverityChart,
  StatusChart,
  TrendChart,
} from "@/components/admin/AdminCharts";
import { AdminShell } from "@/components/layout/Shells";
import { StatCard } from "@/components/reports/StatCard";
import { AccountabilityPanel } from "@/components/admin/AccountabilityPanel";
import { averageResolutionDays, countByStatus, useAllReports, useAllUsers } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Analytics — DriveSafe Vision Admin" },
      { name: "description", content: "Trends, severity mix and hotspots across pothole reports." },
      { property: "og:title", content: "Analytics — DriveSafe Vision Admin" },
      {
        property: "og:description",
        content: "Trends, severity mix and hotspots across pothole reports.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const { data: reports, isLoading } = useAllReports();
  const { data: users } = useAllUsers();
  const [range, setRange] = useState("all");
  const all = useMemo(() => {
    const list = reports ?? [];
    if (range === "all") return list;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const cutoff = start.getTime() - (Number(range) - 1) * 86400000;
    return list.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }, [reports, range]);
  const avgDays = averageResolutionDays(all);
  const resolutionRate = all.length
    ? Math.round((countByStatus(all, "Fixed") / all.length) * 100)
    : 0;
  const totalPotholes = all.reduce((sum, r) => sum + r.pothole_count, 0);

  if (isLoading) {
    return (
      <AdminShell superOnly title="Analytics">
        <div className="surface-card grid place-items-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Crunching numbers…
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell superOnly title="Analytics" subtitle="Patterns across every submitted report">
      <div className="mb-4 flex items-center gap-2">
        <Label htmlFor="analytics-range" className="text-sm">Period</Label>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger id="analytics-range" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary metrics">
        <StatCard label="Reports analysed" value={all.length} tone="primary" />
        <StatCard label="Potholes detected" value={totalPotholes} tone="high" />
        <StatCard label="Resolution rate" value={`${resolutionRate}%`} tone="low" />
        <StatCard
          label="Avg. resolution time"
          value={avgDays != null ? `${avgDays} days` : "—"}
          hint={avgDays == null ? "No resolved reports yet" : undefined}
        />
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <TrendChart reports={all} />
        <SeverityChart reports={all} />
        <StatusChart reports={all} />
        <LocationChart reports={all} />
      </div>

      <AccountabilityPanel reports={all} people={users ?? []} />
    </AdminShell>
  );
}
