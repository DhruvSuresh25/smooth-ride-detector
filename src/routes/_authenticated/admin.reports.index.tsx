import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileStack, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/layout/Shells";
import { ReportsTable } from "@/components/reports/ReportsTable";
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
import { SEVERITIES, STATUSES, STATUS_ORDER } from "@/lib/constants";
import { useAllReports } from "@/lib/reports";
import { useAreas, useStaffRole } from "@/lib/staff";

type ReportSearch = { q: string; status: string; severity: string; area: string; sort: string };

export const Route = createFileRoute("/_authenticated/admin/reports/")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): ReportSearch => ({
    q: typeof search.q === "string" ? search.q : "",
    status: typeof search.status === "string" ? search.status : "all",
    severity: typeof search.severity === "string" ? search.severity : "all",
    area: typeof search.area === "string" ? search.area : "all",
    sort: typeof search.sort === "string" ? search.sort : "newest",
  }),
  head: () => ({
    meta: [
      { title: "All Reports — DriveSafe Vision Admin" },
      { name: "description", content: "Review, filter and update every submitted pothole report." },
      { property: "og:title", content: "All Reports — DriveSafe Vision Admin" },
      {
        property: "og:description",
        content: "Review, filter and update every submitted pothole report.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReportsPage,
});

const PAGE_SIZE = 12;

function AdminReportsPage() {
  const { data: reports, isLoading } = useAllReports();
  const { data: areas } = useAreas();
  const { data: role } = useStaffRole();
  const navigate = useNavigate({ from: Route.fullPath });
  const { q: search, status, severity, area, sort } = Route.useSearch();
  const [page, setPage] = useState(1);

  const setFilters = (patch: Partial<ReportSearch>) => {
    setPage(1);
    void navigate({
      replace: true,
      search: (prev: ReportSearch) => ({ ...prev, ...patch }),
    });
  };

  const filtered = useMemo(() => {
    let list = [...(reports ?? [])];
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) =>
          r.report_number.toLowerCase().includes(term) ||
          r.address.toLowerCase().includes(term) ||
          r.submitter_name.toLowerCase().includes(term) ||
          r.submitter_email.toLowerCase().includes(term),
      );
    }
    if (status !== "all") list = list.filter((r) => r.status === status);
    if (severity !== "all") list = list.filter((r) => r.severity === severity);
    if (area === "unassigned") list = list.filter((r) => !r.area_id);
    else if (area !== "all") list = list.filter((r) => r.area_id === area);

    const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 } as const;
    list.sort((a, b) => {
      if (sort === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "severity") return rank[b.severity] - rank[a.severity];
      if (sort === "status")
        return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [reports, search, status, severity, area, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AdminShell
      title={role?.isAreaAdmin && !role?.isSuper ? "My Area Complaints" : "All Reports"}
      subtitle={`Showing ${filtered.length} of ${reports?.length ?? 0} report(s)`}
    >
      <section className="surface-card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="admin-search">Search</Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="admin-search"
              className="pl-9"
              placeholder="Report no., address or user"
              value={search}
              onChange={(e) => setFilters({ q: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-status">Status</Label>
          <Select value={status} onValueChange={(v) => setFilters({ status: v })}>
            <SelectTrigger id="admin-status">
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
          <Label htmlFor="admin-severity">Severity</Label>
          <Select value={severity} onValueChange={(v) => setFilters({ severity: v })}>
            <SelectTrigger id="admin-severity">
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

        {role?.isSuper && (
          <div className="space-y-1.5">
            <Label htmlFor="admin-area">Area</Label>
            <Select value={area} onValueChange={(v) => setFilters({ area: v })}>
              <SelectTrigger id="admin-area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                <SelectItem value="unassigned">Unassigned (no area)</SelectItem>
                {(areas ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="admin-sort">Sort by</Label>
          <Select value={sort} onValueChange={(v) => setFilters({ sort: v })}>
            <SelectTrigger id="admin-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="status">Status (workflow order)</SelectItem>
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
          <ReportsTable reports={visible} detailBase="/admin/reports" showSubmitter />
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
            <FileStack className="size-7" aria-hidden="true" />
          </span>
          <p className="font-semibold">
            {reports?.length ? "No reports match these filters." : "No reports submitted yet."}
          </p>
        </div>
      )}
    </AdminShell>
  );
}
