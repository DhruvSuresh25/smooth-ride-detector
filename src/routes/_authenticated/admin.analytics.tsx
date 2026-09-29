import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import {
  LocationChart,
  SeverityChart,
  StatusChart,
  TrendChart,
} from "@/components/admin/AdminCharts";
import { AdminShell } from "@/components/layout/Shells";
import { StatCard } from "@/components/reports/StatCard";
import { averageResolutionDays, countByStatus, useAllReports } from "@/lib/reports";

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
  const all = reports ?? [];
  const avgDays = averageResolutionDays(all);
  const resolutionRate = all.length
    ? Math.round((countByStatus(all, "Resolved") / all.length) * 100)
    : 0;
  const totalPotholes = all.reduce((sum, r) => sum + r.pothole_count, 0);

  if (isLoading) {
    return (
      <AdminShell title="Analytics">
        <div className="surface-card grid place-items-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Crunching numbers…
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Analytics" subtitle="Patterns across every submitted report">
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
    </AdminShell>
  );
}
