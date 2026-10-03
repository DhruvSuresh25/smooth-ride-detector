import { cn } from "@/lib/utils";
import {
  severityClasses,
  statusClasses,
  type ReportStatus,
  type Severity,
} from "@/lib/constants";

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const key = (severity as Severity) in severityClasses ? (severity as Severity) : "Low";
  return (
    <Pill className={severityClasses[key]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {severity}
    </Pill>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const key = (status as ReportStatus) in statusClasses ? (status as ReportStatus) : "Submitted";
  return <Pill className={statusClasses[key]}>{status}</Pill>;
}
