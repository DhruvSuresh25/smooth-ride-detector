import type { ReportStatus } from "@/lib/constants";
import type { Report } from "./types";

export function countByStatus(reports: Report[], status: ReportStatus) {
  return reports.filter((r) => r.status === status).length;
}

export function averageResolutionDays(reports: Report[]) {
  const resolved = reports.filter((r) => r.resolved_at);
  if (!resolved.length) return null;
  const totalMs = resolved.reduce(
    (sum, r) => sum + (new Date(r.resolved_at ?? r.created_at).getTime() - new Date(r.created_at).getTime()),
    0,
  );
  return Math.round((totalMs / resolved.length / 86400000) * 10) / 10;
}
