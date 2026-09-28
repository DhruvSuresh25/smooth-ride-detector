import { Link } from "@tanstack/react-router";
import { Eye, MapPin } from "lucide-react";

import { SeverityBadge, StatusBadge } from "@/components/SeverityBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/constants";
import type { Report } from "@/lib/reports";

export function ReportsTable({
  reports,
  detailBase,
  showSubmitter = false,
}: {
  reports: Report[];
  detailBase: "/reports" | "/admin/reports";
  showSubmitter?: boolean;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              {showSubmitter && <TableHead>User</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="text-center">Potholes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-mono text-xs font-semibold">
                  {report.report_number}
                </TableCell>
                {showSubmitter && (
                  <TableCell className="max-w-40">
                    <p className="truncate text-sm font-medium">{report.submitter_name || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {report.submitter_email}
                    </p>
                  </TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(report.created_at)}
                </TableCell>
                <TableCell className="max-w-56">
                  <span className="line-clamp-2 text-sm">{report.address || "Not provided"}</span>
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={report.severity} />
                </TableCell>
                <TableCell className="text-center text-sm font-semibold">
                  {report.pothole_count}
                </TableCell>
                <TableCell>
                  <StatusBadge status={report.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link to={`${detailBase}/$id`} params={{ id: report.id }}>
                      <Eye className="size-3.5" aria-hidden="true" /> View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <ul className="grid gap-3 md:hidden">
        {reports.map((report) => (
          <li key={report.id} className="surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold">{report.report_number}</span>
              <StatusBadge status={report.status} />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {report.address || "Location not provided"}
            </p>
            {showSubmitter && (
              <p className="mt-1 text-xs text-muted-foreground">{report.submitter_email}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SeverityBadge severity={report.severity} />
              <span className="text-xs text-muted-foreground">
                {report.pothole_count} detected · {formatDate(report.created_at)}
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link to={`${detailBase}/$id`} params={{ id: report.id }}>
                View details
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
