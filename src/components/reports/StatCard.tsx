import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  tone?: "default" | "low" | "medium" | "high" | "critical" | "primary";
  hint?: string | undefined;
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary",
    low: "bg-sev-low-bg text-sev-low",
    medium: "bg-sev-medium-bg text-sev-medium",
    high: "bg-sev-high-bg text-sev-high",
    critical: "bg-sev-critical-bg text-sev-critical",
  };

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("grid size-9 place-items-center rounded-lg", tones[tone])}>
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
