import { createFileRoute } from "@tanstack/react-router";
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
import { SEVERITIES, STATUSES } from "@/lib/constants";
import { useAllReports } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/admin/reports/")({
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

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

    const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 } as const;
    list.sort((a, b) => {
      if (sort === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "severity") return rank[b.severity] - rank[a.severity];
      if (sort === "status") return a.status.localeCompare(b.status);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [reports, search, status, severity, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AdminShell
      title="All Reports"
      subtitle={`${filtered.length} of ${reports?.length ?? 0} report(s) shown`}
    >
      <section className="surface-card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-status">Status</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
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
          <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
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

        <div className="space-y-1.5">
          <Label htmlFor="admin-sort">Sort by</Label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger id="admin-sort">
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
