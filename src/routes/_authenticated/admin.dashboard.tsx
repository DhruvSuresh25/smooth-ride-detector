import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileStack,
  Loader2,
  Timer,
  Users,
} from "lucide-react";

import { AdminShell } from "@/components/layout/Shells";
import { SeverityChart, StatusChart, TrendChart } from "@/components/admin/AdminCharts";
import { ReportsTable } from "@/components/reports/ReportsTable";
import { StatCard } from "@/components/reports/StatCard";
import { Button } from "@/components/ui/button";
import { averageResolutionDays, countByStatus, useAllReports, useAllUsers } from "@/lib/reports";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatRate, formatRating, useMyAreas, useMyWarnings, usePerformance, useStaffRole } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Admin Overview — DriveSafe Vision" },
      { name: "description", content: "Road maintenance overview of all pothole reports." },
      { property: "og:title", content: "Admin Overview — DriveSafe Vision" },
      { property: "og:description", content: "Road maintenance overview of all pothole reports." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboardPage,
});

function MyPerformance() {
  const { user } = useAuth();
  const { data: role } = useStaffRole();
  const { data: perf } = usePerformance(role?.isAreaAdmin ? user?.id : null);
  const { data: warnings } = useMyWarnings();
  if (!role?.isAreaAdmin || role.isSuper) return null;
  return (
    <section className="surface-card mb-5 p-5" aria-label="My performance">
      <h2 className="font-bold">My performance</h2>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">On-time rate</p>
          <p className="text-lg font-bold">{formatRate(perf)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Average rating</p>
          <p className="text-lg font-bold">{formatRating(perf)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Overdue</p>
          <p className="text-lg font-bold">{perf?.overdue ?? 0}</p>
        </div>
      </div>
      {!!warnings?.length && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold text-sev-critical">Warnings from super admin</h3>
          {warnings.map((w) => (
            <p key={w.id} className="rounded-lg bg-sev-critical-bg p-3 text-sm">
              {w.message}
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDate(w.created_at)}
              </span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminDashboardPage() {
  const { data: reports, isLoading } = useAllReports();
  const { data: users } = useAllUsers();
  const { data: role } = useStaffRole();
  const { data: myAreas } = useMyAreas();
  const all = reports ?? [];
  const avgDays = averageResolutionDays(all);
  const areaAdmin = !!role?.isAreaAdmin && !role?.isSuper;
  const areaNames = (myAreas ?? []).map((a) => a.name).join(", ");

  return (
    <AdminShell
      title="Overview"
      subtitle={
        areaAdmin
          ? areaNames
            ? `Reports in ${areaNames}`
            : "Reports in your assigned areas"
          : "All reports across DriveSafe Vision"
      }
    >
      <MyPerformance />
      {isLoading ? (
        <div className="surface-card grid place-items-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Loading reports…
        </div>
      ) : (
        <>
          <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Total reports" value={all.length} icon={FileStack} tone="primary" />
            <StatCard
              label="New (Submitted)"
              value={countByStatus(all, "Submitted")}
              icon={Clock}
              tone="medium"
              hint="Not yet marked Received"
            />
            <StatCard
              label="Fixed"
              value={countByStatus(all, "Fixed")}
              icon={CheckCircle2}
              tone="low"
            />
            <StatCard
              label="Critical severity"
              value={all.filter((r) => r.severity === "Critical").length}
              icon={AlertTriangle}
              tone="critical"
            />
            <StatCard
              label="Avg. resolution time"
              value={avgDays != null ? `${avgDays} days` : "—"}
              icon={Timer}
              hint={avgDays == null ? "No resolved reports yet" : undefined}
            />
            <StatCard label="Registered users" value={users?.length ?? 0} icon={Users} />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-2" aria-label="Charts">
            <StatusChart reports={all} />
            <SeverityChart reports={all} />
            <div className="xl:col-span-2">
              <TrendChart reports={all} />
            </div>
          </section>

          <section className="mt-8" aria-label="Latest reports">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Latest submissions</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/reports">View all reports</Link>
              </Button>
            </div>
            {all.length ? (
              <ReportsTable reports={all.slice(0, 6)} detailBase="/admin/reports" showSubmitter />
            ) : (
              <div className="surface-card p-12 text-center text-sm text-muted-foreground">
                No reports have been submitted yet.
              </div>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
