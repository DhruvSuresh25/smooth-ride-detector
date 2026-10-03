import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Database, Info, ScanEye, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DeadlineRules, ThresholdSetting } from "@/components/admin/SettingsExtras";
import { AdminShell } from "@/components/layout/Shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ANALYSIS_DISCLAIMER, APP_NAME, APP_TAGLINE, SEVERITIES, STATUSES } from "@/lib/constants";
import { useDeadlineDays } from "@/lib/staff";
import { isDetectionApiConfigured } from "@/services/potholeAnalysis";

function DeadlineSetting() {
  const qc = useQueryClient();
  const { data: days } = useDeadlineDays();
  const [value, setValue] = useState("7");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (days != null) setValue(String(days));
  }, [days]);

  async function save() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      toast.error("Enter a whole number of days between 1 and 365");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ id: 1, default_deadline_days: n });
    setSaving(false);
    if (error) {
      toast.error("Could not save", { description: error.message });
      return;
    }
    toast.success(`New complaints now get ${n} days to be fixed`);
    void qc.invalidateQueries({ queryKey: ["app-settings"] });
  }

  return (
    <section className="surface-card p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <CalendarClock className="size-4 text-primary" aria-hidden="true" /> Fix deadline
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Days an area admin has to fix a new complaint before it becomes Overdue.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={365}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28"
          aria-label="Default deadline in days"
        />
        <span className="text-sm text-muted-foreground">days</span>
        <Button size="sm" onClick={save} disabled={saving}>
          Save
        </Button>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/admin/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Settings — DriveSafe Vision Admin" },
      { name: "description", content: "System configuration, detection source and workflow rules." },
      { property: "og:title", content: "Settings — DriveSafe Vision Admin" },
      {
        property: "og:description",
        content: "System configuration, detection source and workflow rules.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <AdminShell superOnly title="Settings" subtitle="How this deployment is configured">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <ScanEye className="size-4 text-primary" aria-hidden="true" /> Detection engine
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row
              label="Detection source"
              value={
                <Badge
                  variant="outline"
                  className={
                    isDetectionApiConfigured
                      ? "border-sev-low/30 bg-sev-low-bg text-sev-low"
                      : "border-sev-medium/30 bg-sev-medium-bg text-sev-medium"
                  }
                >
                  {isDetectionApiConfigured ? "External API connected" : "Simulated demo analysis"}
                </Badge>
              }
            />
            <Row label="Severity levels" value={SEVERITIES.join(", ")} />
            <Row label="Accepted formats" value="JPG, JPEG, PNG up to 8 MB" />
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {ANALYSIS_DISCLAIMER} Connect a real detection service by replacing the request inside
            the analysis service file — see the project README for the exact steps.
          </p>
        </section>

        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Access &amp; roles
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Citizen accounts" value="Self sign-up with email and password" />
            <Row label="Administrators" value="Granted server-side by role assignment" />
            <Row label="Report visibility" value="Citizens see their own; admins see all" />
          </div>
          <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            Administrator access is never granted through the interface and there are no built-in
            admin credentials. A new administrator is promoted by adding an admin role row for their
            account, as documented in the README.
          </p>
        </section>

        <DeadlineSetting />
        <ThresholdSetting />
        <DeadlineRules />

        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Database className="size-4 text-primary" aria-hidden="true" /> Workflow
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Statuses" value={STATUSES.join(" → ")} />
            <Row label="History" value="Every status change is recorded with the admin's account" />
            <Row label="Images" value="Stored privately; access requires a signed link" />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-bold">About</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Application" value={APP_NAME} />
            <Row label="Tagline" value={APP_TAGLINE} />
            <Row label="Portals" value="Citizen reporting portal and administrator portal" />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
