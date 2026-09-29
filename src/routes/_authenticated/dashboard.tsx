import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Hammer,
  Loader2,
  Plus,
  ScanSearch,
  Search,
} from "lucide-react";

import { ReportsTable } from "@/components/reports/ReportsTable";
import { StatCard } from "@/components/reports/StatCard";
import { UserShell } from "@/components/layout/Shells";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useAuth";
import { countByStatus, useMyReports } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/dashboard")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Dashboard — DriveSafe Vision" },
      { name: "description", content: "Your pothole reports and their current status." },
      { property: "og:title", content: "Dashboard — DriveSafe Vision" },
      { property: "og:description", content: "Your pothole reports and their current status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  const { data: reports, isLoading, isError, error } = useMyReports();

  const firstName = (profile?.full_name || "").split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <UserShell
      title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      subtitle={today}
      actions={
        <Button asChild className="w-full gap-2 sm:w-auto">
          <Link to="/analyze">
            <Plus className="size-4" aria-hidden="true" /> Analyze New Image
          </Link>
        </Button>
      }
    >
      {isError && (
        <div className="surface-card mb-6 border-destructive/30 p-4 text-sm text-destructive">
          Could not load your reports: {(error as Error).message}
        </div>
      )}

      <section aria-label="Report statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Reports"
          value={reports?.length ?? 0}
          icon={ClipboardList}
          tone="primary"
        />
        <StatCard
          label="Pending Review"
          value={countByStatus(reports ?? [], "Pending")}
          icon={Clock}
          tone="medium"
        />
        <StatCard
          label="Under Review"
          value={countByStatus(reports ?? [], "Under Review")}
          icon={Search}
          tone="primary"
        />
        <StatCard
          label="Action Taken"
          value={countByStatus(reports ?? [], "Action Taken")}
          icon={Hammer}
          tone="high"
        />
        <StatCard
          label="Resolved"
          value={countByStatus(reports ?? [], "Resolved")}
          icon={CheckCircle2}
          tone="low"
        />
      </section>

      <section className="mt-8" aria-label="Recent reports">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Recent reports</h2>
          {!!reports?.length && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/reports">View all</Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="surface-card grid place-items-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            Loading your reports…
          </div>
        ) : reports?.length ? (
          <ReportsTable reports={reports.slice(0, 5)} detailBase="/reports" />
        ) : (
          <div className="surface-card grid place-items-center gap-3 p-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <ScanSearch className="size-7" aria-hidden="true" />
            </span>
            <p className="font-semibold">You have not submitted any reports yet.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Upload a photo of a damaged road and we&apos;ll assess the pothole severity for you.
            </p>
            <Button asChild className="mt-1">
              <Link to="/analyze">Analyze Your First Image</Link>
            </Button>
          </div>
        )}
      </section>
    </UserShell>
  );
}
