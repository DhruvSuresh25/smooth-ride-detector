import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/Shells";
import { SeverityBadge, StatusBadge } from "@/components/SeverityBadge";
import { StorageImage } from "@/components/StorageImage";
import { StatusTimeline } from "@/components/reports/StatusTimeline";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_STATUSES, STATUSES, formatDateTime, isOverdue, timeLeft, type ReportStatus } from "@/lib/constants";
import { useAreas, useStaffRole } from "@/lib/staff";
import { useQuery } from "@tanstack/react-query";
import { useReport, useReportHistory } from "@/lib/reports";
import { useServerFn } from "@tanstack/react-start";
import { notifyReportUpdate } from "@/lib/report-notify.functions";

export const Route = createFileRoute("/_authenticated/admin/reports/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Manage report — DriveSafe Vision Admin" },
      { name: "description", content: "Inspect detection evidence and update the repair status." },
      { property: "og:title", content: "Manage report — DriveSafe Vision Admin" },
      {
        property: "og:description",
        content: "Inspect detection evidence and update the repair status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReportDetailPage,
});

function AdminReportDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: report, isLoading } = useReport(id);
  const { data: history } = useReportHistory(id);

  const [status, setStatus] = useState<ReportStatus>("Submitted");
  const { data: role } = useStaffRole();
  const isSuper = !!role?.isSuper;
  const { data: areas } = useAreas();
  const [areaId, setAreaId] = useState<string>("none");
  const [assignee, setAssignee] = useState<string>("none");
  const { data: areaAdmins } = useQuery({
    queryKey: ["area-admin-options"],
    enabled: isSuper,
    queryFn: async () => {
      const { data: ids } = await supabase.from("area_admins").select("user_id");
      const list = (ids ?? []).map((r) => r.user_id);
      if (!list.length) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", list);
      return data ?? [];
    },
  });
  const [notes, setNotes] = useState("");
  const [repairFile, setRepairFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const notify = useServerFn(notifyReportUpdate);

  useEffect(() => {
    if (report) {
      setStatus(report.status);
      setNotes(report.admin_notes ?? "");
      setAreaId(report.area_id ?? "none");
      setAssignee(report.assigned_admin_id ?? "none");
    }
  }, [report]);

  async function saveUpdate() {
    if (!report) return;
    setSaving(true);
    let repairRef: string | undefined;
    if (repairFile) {
      if (repairFile.size > 8 * 1024 * 1024) {
        setSaving(false);
        toast.error("Repair photo must be 8 MB or smaller");
        return;
      }
      const path = `repair/${report.id}-${Date.now()}.${repairFile.type === "image/png" ? "png" : "jpg"}`;
      const { error: upErr } = await supabase.storage
        .from("report-annotated-images")
        .upload(path, repairFile, { contentType: repairFile.type });
      if (upErr) {
        setSaving(false);
        toast.error("Could not upload repair photo", { description: upErr.message });
        return;
      }
      repairRef = `report-annotated-images/${path}`;
    }
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        admin_notes: notes.trim() || null,
        ...(repairRef ? { repair_image_url: repairRef } : {}),
        ...(isSuper
          ? {
              area_id: areaId === "none" ? null : areaId,
              assigned_admin_id: assignee === "none" ? null : assignee,
            }
          : {}),
      })
      .eq("id", report.id);

    if (error) {
      setSaving(false);
      toast.error("Could not update report", { description: error.message });
      return;
    }

    if (status !== report.status) {
      const { error: historyError } = await supabase.from("report_status_history").insert({
        report_id: report.id,
        status,
        note: notes.trim() || null,
        changed_by: user?.id ?? null,
      });
      if (historyError) {
        setSaving(false);
        toast.error("Status saved, but the timeline entry failed", {
          description: historyError.message,
        });
        return;
      }
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["report", report.id] }),
      queryClient.invalidateQueries({ queryKey: ["report-history", report.id] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]);
    let emailNote = "";
    if (isSuper) try {
      emailNote = "The citizen has been emailed.";
      const res = await notify({ data: { reportId: report.id } });
      if (!res.sent) emailNote = "No email sent (citizen turned off emails or unsubscribed).";
    } catch {
      emailNote = "Saved, but the email to the citizen could not be sent.";
    }
    void queryClient.invalidateQueries({ queryKey: ["performance"] });
    setSaving(false);
    toast.success("Report updated", { description: `Status set to ${status}. ${emailNote}`.trim() });
  }

  if (isLoading) {
    return (
      <AdminShell title="Report">
        <div className="surface-card grid place-items-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Loading report…
        </div>
      </AdminShell>
    );
  }

  if (!report) {
    return (
      <AdminShell title="Report not found">
        <div className="surface-card grid place-items-center gap-3 p-12 text-center">
          <p className="font-semibold">That report no longer exists.</p>
          <Button asChild variant="outline">
            <Link to="/admin/reports">Back to all reports</Link>
          </Button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={report.report_number}
      subtitle={`Submitted ${formatDateTime(report.created_at)} by ${
        report.submitter_name || report.submitter_email
      }`}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/reports">
            <ArrowLeft className="size-4" aria-hidden="true" /> All reports
          </Link>
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={report.status} />
              {isOverdue(report) && <StatusBadge status="Overdue" />}
              <SeverityBadge severity={report.severity} />
              <span className="text-sm text-muted-foreground">
                {report.pothole_count} pothole(s) detected
              </span>
            </div>

            <Tabs defaultValue="annotated" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="annotated">Annotated image</TabsTrigger>
                <TabsTrigger value="original">Original image</TabsTrigger>
              </TabsList>
              <TabsContent value="annotated">
                <StorageImage
                  path={report.annotated_image_url}
                  alt={`Annotated road image for ${report.report_number}`}
                  className="max-h-[420px] w-full border border-border"
                  emptyLabel="No annotated image stored for this report"
                />
              </TabsContent>
              <TabsContent value="original">
                <StorageImage
                  path={report.original_image_url}
                  alt={`Original uploaded road image for ${report.report_number}`}
                  className="max-h-[420px] w-full border border-border"
                />
              </TabsContent>
            </Tabs>
          </section>

          <section className="surface-card p-5">
            <h2 className="font-bold">Detection &amp; submission details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Detail label="Detections" value={String(report.pothole_count)} />
              <Detail label="Severity" value={report.severity} />
              <Detail
                label="Confidence"
                value={report.confidence != null ? `${report.confidence}%` : "—"}
              />
              <Detail
                label="Estimated width"
                value={report.estimated_width != null ? `${report.estimated_width} cm` : "—"}
              />
              <Detail
                label="Estimated height"
                value={report.estimated_height != null ? `${report.estimated_height} cm` : "—"}
              />
              <Detail label="Road position" value={report.road_position ?? "—"} />
              <Detail label="Submitted by" value={report.submitter_name || "—"} />
              <Detail label="Email" value={report.submitter_email} />
              <Detail label="Submitted" value={formatDateTime(report.created_at)} />
              <Detail
                label="Fix deadline"
                value={`${formatDateTime(report.deadline_at)}${timeLeft(report) ? ` (${timeLeft(report)})` : ""}`}
              />
              <Detail label="Area" value={areas?.find((a) => a.id === report.area_id)?.name ?? "Not set"} />
              <Detail
                label="Citizen rating"
                value={report.citizen_rating != null ? `${report.citizen_rating} / 5` : "Not rated"}
              />
              {report.confirmed_fixed != null && (
                <Detail
                  label="Citizen confirmation"
                  value={report.confirmed_fixed ? "Confirmed fixed" : "Says it is still there"}
                />
              )}
              {report.citizen_comment && (
                <div className="sm:col-span-3">
                  <Detail label="Citizen feedback" value={report.citizen_comment} />
                </div>
              )}
              <div className="sm:col-span-2">
                <Detail label="Address" value={report.address || "Not provided"} />
              </div>
              <Detail
                label="Coordinates"
                value={
                  report.latitude != null && report.longitude != null
                    ? `${report.latitude}, ${report.longitude}`
                    : "Not captured"
                }
              />
              {report.description && (
                <div className="sm:col-span-3">
                  <Detail label="Citizen notes" value={report.description} />
                </div>
              )}
            </dl>
            {report.latitude != null && report.longitude != null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
              >
                <MapPin className="size-4" aria-hidden="true" /> Open location on map
              </a>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="surface-card p-5" aria-label="Update report">
            <h2 className="font-bold">Update report</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-select">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
                  <SelectTrigger id="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(isSuper ? STATUSES : [report.status, ...ADMIN_STATUSES.filter((s) => s !== report.status)]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isSuper && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="area-select">Area</Label>
                    <Select value={areaId} onValueChange={setAreaId}>
                      <SelectTrigger id="area-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No area</SelectItem>
                        {(areas ?? []).map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignee-select">Assigned area admin</Label>
                    <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger id="assignee-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {(areaAdmins ?? []).map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin notes</Label>
                <Textarea
                  id="admin-notes"
                  rows={4}
                  placeholder="Repair plan, crew assignment, inspection findings…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Notes are visible to the citizen who filed this report.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="repair-photo">After-repair photo (optional)</Label>
                <input
                  id="repair-photo"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="block w-full text-sm"
                  onChange={(e) => setRepairFile(e.target.files?.[0] ?? null)}
                />
                {report.repair_image_url && (
                  <StorageImage
                    path={report.repair_image_url}
                    alt={`After-repair photo for ${report.report_number}`}
                    className="max-h-48 w-full border border-border"
                  />
                )}
              </div>
              <Button onClick={saveUpdate} disabled={saving} className="w-full gap-2">
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                Update Report
              </Button>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="font-bold">Status history</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Every status change is recorded for accountability.
            </p>
            <StatusTimeline report={report} events={history ?? []} />
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}
