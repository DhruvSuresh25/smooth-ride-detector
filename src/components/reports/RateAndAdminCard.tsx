import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatRate, formatRating, usePerformance } from "@/lib/staff";
import { cn } from "@/lib/utils";

type RateableReport = {
  id: string;
  status: string;
  citizen_rating?: number | null;
  assigned_admin_id?: string | null;
};

export function RateAndAdminCard({ report }: { report: RateableReport }) {
  const qc = useQueryClient();
  const { data: perf } = usePerformance(report.assigned_admin_id ?? null);
  const [pick, setPick] = useState(0);
  const [saving, setSaving] = useState(false);
  const rated = report.citizen_rating ?? null;

  async function submit() {
    if (!pick) return;
    setSaving(true);
    const { error } = await supabase.rpc("rate_report", { _report_id: report.id, _rating: pick });
    setSaving(false);
    if (error) {
      toast.error("Could not save rating", { description: error.message });
      return;
    }
    toast.success("Thanks for rating this repair");
    void qc.invalidateQueries({ queryKey: ["report", report.id] });
    void qc.invalidateQueries({ queryKey: ["performance"] });
  }

  return (
    <section className="surface-card p-5">
      <h2 className="font-bold">Your area admin</h2>
      {report.assigned_admin_id ? (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">On-time rate</span>
            <span className="font-semibold">{formatRate(perf)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Average rating</span>
            <span className="font-semibold">{formatRating(perf)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No area admin assigned yet.</p>
      )}

      {report.status === "Fixed" && (
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">
            {rated ? "Your rating" : "Rate this repair"}
          </h3>
          <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (rated ?? pick) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={(rated ?? pick) === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  disabled={!!rated || saving}
                  onClick={() => setPick(n)}
                  className="p-0.5 disabled:cursor-default"
                >
                  <Star
                    className={cn(
                      "size-6",
                      active ? "fill-sev-medium text-sev-medium" : "text-muted-foreground",
                    )}
                  />
                </button>
              );
            })}
          </div>
          {!rated && (
            <Button size="sm" className="mt-3" disabled={!pick || saving} onClick={submit}>
              {saving && <Loader2 className="size-4 animate-spin" />} Submit rating
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
