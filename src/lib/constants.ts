export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const STATUSES = [
  "Pending",
  "Under Review",
  "Action Taken",
  "Resolved",
  "Rejected",
] as const;
export type ReportStatus = (typeof STATUSES)[number];

export const TIMELINE_STEPS: ReportStatus[] = [
  "Pending",
  "Under Review",
  "Action Taken",
  "Resolved",
];

export const severityClasses: Record<Severity, string> = {
  Low: "bg-sev-low-bg text-sev-low border-sev-low/25",
  Medium: "bg-sev-medium-bg text-sev-medium border-sev-medium/25",
  High: "bg-sev-high-bg text-sev-high border-sev-high/25",
  Critical: "bg-sev-critical-bg text-sev-critical border-sev-critical/25",
};

export const statusClasses: Record<ReportStatus, string> = {
  Pending: "bg-sev-medium-bg text-sev-medium border-sev-medium/25",
  "Under Review": "bg-primary-soft text-primary border-primary/25",
  "Action Taken": "bg-accent text-accent-foreground border-primary/25",
  Resolved: "bg-sev-low-bg text-sev-low border-sev-low/25",
  Rejected: "bg-muted text-muted-foreground border-border",
};

export const APP_NAME = "DriveSafe Vision";
export const APP_TAGLINE = "Real-Time Pothole Detection Using Deep Learning";

export const ANALYSIS_DISCLAIMER =
  "Severity is estimated by AI from the photo — an inspector confirms it on site.";

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initialsOf(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "U").concat(parts[1]?.[0] ?? "").toUpperCase();
}
