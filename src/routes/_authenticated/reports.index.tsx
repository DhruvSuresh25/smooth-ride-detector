import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ReportsTable } from "@/components/reports/ReportsTable";
import { UserShell } from "@/components/layout/Shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEVERITIES, STATUSES } from "@/lib/constants";
import { useMyReports } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({
    meta: [
      { title: "My Reports — DriveSafe Vision" },
      { name: "description", content: "Search, filter and track every pothole report you filed." },
      { property: "og:title", content: "My Reports — DriveSafe Vision" },
      {
        property: "og:description",
        content: "Search, filter and track every pothole report you filed.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyReportsPage,
});

const PAGE_SIZE = 10;

function MyReportsPage() {
  const { data: reports, isLoading } = useMyReports();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...(reports ?? [])];
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) =>
          r.report_number.toLowerCase().includes(term) || r.address.toLowerCase().includes(term),
      );
    }
    if (status !== "all") list = list.filter((r) => r.status === status);
    if (severity !== "all") list = list.filter((r) => r.severity === severity);
    if (dateFilter !== "all") {
      const days = Number(dateFilter);
      const cutoff = Date.now() - days * 86400000;
      list = list.filter((r) => new Date(r.created_at).getTime() >= cutoff);
    }

    const severityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 } as const;
    list.sort((a, b) => {
      if (sort === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "severity") return severityRank[b.severity] - severityRank[a.severity];
      if (sort === "status") return a.status.localeCompare(b.status);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [reports, search, status, severity, dateFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <UserShell title="My Reports" subtitle={`${reports?.length ?? 0} report(s) submitted`}>
      <section className="surface-card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="search"
              className="pl-9"
              placeholder="Report no. or address"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status-filter">Status</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="severity-filter">Severity</Label>
          <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
            <SelectTrigger id="severity-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date-filter">Date</Label>
          <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1); }}>
            <SelectTrigger id="date-filter">
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

        <div className="space-y-1.5">
          <Label htmlFor="sort">Sort by</Label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {isLoading ? (
        <div className="surface-card grid place-items-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Loading reports…
        </div>
      ) : visible.length ? (
        <>
          <ReportsTable reports={visible} detailBase="/reports" />
          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                Page {currentPage} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="surface-card grid place-items-center gap-3 p-12 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ClipboardList className="size-7" aria-hidden="true" />
          </span>
          <p className="font-semibold">
            {reports?.length ? "No reports match these filters." : "You have not submitted any reports yet."}
          </p>
          <Button asChild>
            <Link to="/analyze">Analyze Your First Image</Link>
          </Button>
        </div>
      )}
    </UserShell>
  );
}
