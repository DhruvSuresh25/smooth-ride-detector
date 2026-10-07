import { Check, Circle, RotateCcw, XCircle } from "lucide-react";

import { TIMELINE_STEPS, formatDateTime } from "@/lib/constants";
import type { Report, StatusEvent } from "@/lib/reports";
import { cn } from "@/lib/utils";

export function StatusTimeline({
  report,
  events,
}: {
  report: Report;
  events: StatusEvent[];
}) {
  const rejected = report.status === "Rejected" || report.status === "Duplicate";
  // The timeline is built from the recorded history only, so it can never
  // contradict the status badge. A step counts as reached when the latest
  // event for it is not undone by a later reopen (a move back to Submitted).
  const stepOf = (s: string) => TIMELINE_STEPS.indexOf(s as (typeof TIMELINE_STEPS)[number]);
  const reopenedAt =
    !rejected && report.status === "Submitted"
      ? (events.filter((e) => e.status === "Submitted").at(-1)?.created_at ?? null)
      : null;
  const reopened = reopenedAt != null && events.some((e) => stepOf(e.status) > 0);

  const latestEventFor = (status: string) => {
    const list = events.filter((e) => e.status === status);
    return list.at(-1) ?? null;
  };
  const reachedStep = (status: string) => {
    const ev = latestEventFor(status);
    if (!ev) return false;
    if (reopened && stepOf(status) > 0) {
      // After a reopen, only steps re-reached after the reopen count.
      return new Date(ev.created_at) > new Date(reopenedAt!);
    }
    return true;
  };

  const steps = [
    ...TIMELINE_STEPS.map((s) => ({ label: s === "Submitted" ? "Report Submitted" : s, status: s })),
  ];

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const event = latestEventFor(step.status);
        const reached = step.status === "Submitted" ? true : !rejected && reachedStep(step.status);
        const isCurrent = !rejected && step.status === report.status && step.status !== "Submitted";

        return (
          <li key={step.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border-2",
                  reached
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/15",
                )}
              >
                {reached ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Circle className="size-2.5" aria-hidden="true" />
                )}
              </span>
              {index < steps.length - 1 && (
                <span
                  className={cn("w-0.5 flex-1 min-h-8", reached ? "bg-primary/40" : "bg-border")}
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="pb-6">
              <p
                className={cn(
                  "text-sm font-semibold",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Current
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {event ? formatDateTime(event.created_at) : "Not reached yet"}
              </p>
              {event?.note && <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>}
            </div>
          </li>
        );
      })}

      {rejected && (
        <li className="flex gap-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-destructive bg-destructive text-destructive-foreground">
            <XCircle className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">{report.status === "Duplicate" ? "Marked duplicate" : "Rejected"}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(events.find((e) => e.status === report.status)?.created_at ?? report.updated_at)}
            </p>
            {report.admin_notes && (
              <p className="mt-1 text-sm text-muted-foreground">{report.admin_notes}</p>
            )}
          </div>
        </li>
      )}
    </ol>
  );
}
