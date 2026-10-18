import type { Performance, Band } from "./types";

export function formatRate(p: Performance | null | undefined) {
  return p?.on_time_rate != null ? `${p.on_time_rate}%` : "—";
}
export function formatRating(p: Performance | null | undefined) {
  return p?.avg_rating != null ? `${p.avg_rating} / 5 (${p.rating_count})` : "No ratings yet";
}

export function performanceBand(
  p: Performance | null | undefined,
  t: { good: number; poor: number } | undefined,
): Band {
  if (p?.on_time_rate == null || !t) return null;
  if (p.on_time_rate >= t.good) return "Good";
  if (p.on_time_rate < t.poor) return "Poor";
  return "Average";
}
export const bandClasses: Record<"Good" | "Average" | "Poor", string> = {
  Good: "bg-sev-low-bg text-sev-low border-sev-low/25",
  Average: "bg-sev-medium-bg text-sev-medium border-sev-medium/25",
  Poor: "bg-sev-critical-bg text-sev-critical border-sev-critical/25",
};
