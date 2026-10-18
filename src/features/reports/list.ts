import { STATUS_ORDER } from "@/lib/constants";
import type { Report } from "./types";

type Filters = {
  search: string;
  status: string;
  severity: string;
  sort: string;
  area?: string;
  dateFilter?: string;
  includeSubmitter?: boolean;
};

const severityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 } as const;

/** Shared list rules; pagination and URL/form state remain owned by each screen. */
export function filterAndSortReports(reports: Report[], filters: Filters, now = new Date()) {
  const term = filters.search.trim().toLowerCase();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const cutoff = start.getTime() - (Number(filters.dateFilter) - 1) * 86400000;
  const list = reports.filter((report) => {
    const searchable = [report.report_number, report.address];
    if (filters.includeSubmitter) searchable.push(report.submitter_name, report.submitter_email);
    if (term && !searchable.some((value) => value.toLowerCase().includes(term))) return false;
    if (filters.status !== "all" && report.status !== filters.status) return false;
    if (filters.severity !== "all" && report.severity !== filters.severity) return false;
    if (filters.area === "unassigned" && report.area_id) return false;
    if (filters.area && !["all", "unassigned"].includes(filters.area) && report.area_id !== filters.area) return false;
    if (filters.dateFilter && filters.dateFilter !== "all" && new Date(report.created_at).getTime() < cutoff) return false;
    return true;
  });
  return list.sort((a, b) => {
    if (filters.sort === "severity") return severityRank[b.severity] - severityRank[a.severity];
    if (filters.sort === "status") return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    const difference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return filters.sort === "oldest" ? difference : -difference;
  });
}