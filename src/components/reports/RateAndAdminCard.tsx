import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatRate, formatRating, usePerformance } from "@/lib/staff";
import { cn } from "@/lib/utils";

type RateableReport = {
  id: string;
  status: string;
  citizen_rating?: number | null;
  citizen_comment?: string | null;
  confirmed_fixed?: boolean | null;
  assigned_admin_id?: string | null;
};

export function RateAndAdminCard({ report }: { report: RateableReport }) {
  const qc = useQueryClient();
  const { data: perf } = usePerformance(report.assigned_admin_id ?? null);
  const [pick, setPick] = useState(0);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const rated = report.citizen_rating ?? null;

  async function submit() {
    if (!pick || confirmed === null) return;
    setSaving(true);
    const { error } = await supabase.rpc("submit_feedback", {
      _report_id: report.id,
      _rating: pick,
      _confirmed: confirmed,
      _comment: comment.slice(0, 1000),
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save rating", { description: error.message });
      return;
    }
    toast.success("Thanks for your feedback");
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
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">{rated ? "Your feedback" : "Rate this repair"}</h3>

          {rated ? (
            <p className="text-sm">
              {report.confirmed_fixed === false ? "You said the pothole is still there." : "You confirmed it is fixed."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={confirmed === true ? "default" : "outline"} onClick={() => setConfirmed(true)}>
                Yes, it's fixed
              </Button>
              <Button size="sm" variant={confirmed === false ? "default" : "outline"} onClick={() => setConfirmed(false)}>
                No, still there
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
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
                    (rated ?? pick) >= n ? "fill-sev-medium text-sev-medium" : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>

          {rated ? (
            report.citizen_comment && <p className="text-sm text-muted-foreground">"{report.citizen_comment}"</p>
          ) : (
            <>
              <Textarea
                rows={3}
                maxLength={1000}
                placeholder="Optional comment about the quality and speed of the repair"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button size="sm" disabled={!pick || confirmed === null || saving} onClick={submit}>
                {saving && <Loader2 className="size-4 animate-spin" />} Submit feedback
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
