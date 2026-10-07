export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const STATUSES = ["Submitted", "Received", "In Progress", "Fixed", "Rejected", "Duplicate"] as const;
export type ReportStatus = (typeof STATUSES)[number];

export const TIMELINE_STEPS: ReportStatus[] = ["Submitted", "Received", "In Progress", "Fixed"];

/** Statuses an area admin may set. */
export const ADMIN_STATUSES: ReportStatus[] = ["Received", "In Progress", "Fixed", "Rejected", "Duplicate"];

/** Workflow position of each status, for sorting lists in pipeline order. */
export const STATUS_ORDER: Record<string, number> = Object.fromEntries(
  STATUSES.map((s, i) => [s, i]),
);

export function isOverdue(r: { status: string; deadline_at: string | null }) {
  return !!r.deadline_at && !CLOSED_STATUSES.includes(r.status) && new Date(r.deadline_at) < new Date();
}

export const CLOSED_STATUSES: string[] = ["Fixed", "Rejected", "Duplicate"];

/** "3 days left", "45 min left", "Overdue by 2 days"; null when closed or no deadline. */
export function timeLeft(r: { status: string; deadline_at: string | null }) {
  if (!r.deadline_at || CLOSED_STATUSES.includes(r.status)) return null;
  const ms = new Date(r.deadline_at).getTime() - Date.now();
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor(abs / 3600000);
  const minutes = Math.floor(abs / 60000);
  const span =
    days >= 1
      ? `${days} day${days > 1 ? "s" : ""}`
      : hours >= 1
        ? `${hours} hour${hours > 1 ? "s" : ""}`
        : `${Math.max(minutes, 1)} min`;
  return ms >= 0 ? `${span} left` : `Overdue by ${span}`;
}

export const severityClasses: Record<Severity, string> = {
  Low: "bg-sev-low-bg text-sev-low border-sev-low/25",
  Medium: "bg-sev-medium-bg text-sev-medium border-sev-medium/25",
  High: "bg-sev-high-bg text-sev-high border-sev-high/25",
  Critical: "bg-sev-critical-bg text-sev-critical border-sev-critical/25",
};

export const statusClasses: Record<ReportStatus, string> = {
  Submitted: "bg-sev-medium-bg text-sev-medium border-sev-medium/25",
  Received: "bg-primary-soft text-primary border-primary/25",
  "In Progress": "bg-accent text-accent-foreground border-primary/25",
  Fixed: "bg-sev-low-bg text-sev-low border-sev-low/25",
  Rejected: "bg-muted text-muted-foreground border-border",
  Duplicate: "bg-muted text-muted-foreground border-border",
};

export const APP_NAME = "DriveSafe Vision";
export const APP_TAGLINE = "Real-Time Pothole Detection Using Deep Learning";

export const ANALYSIS_DISCLAIMER =
  "Severity is estimated by AI from the photo — an inspector confirms it on site.";

/** All dates are stored in UTC and shown to users in Indian Standard Time. */
export const DISPLAY_TIMEZONE = "Asia/Kolkata";

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return `${new Date(value).toLocaleString("en-IN", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} IST`;
}

export function initialsOf(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "U").concat(parts[1]?.[0] ?? "").toUpperCase();
}
