import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Info, Loader2, MapPin } from "lucide-react";

import { SeverityBadge, StatusBadge } from "@/components/SeverityBadge";
import { StorageImage } from "@/components/StorageImage";
import { UserShell } from "@/components/layout/Shells";
import { StatusTimeline } from "@/components/reports/StatusTimeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, isOverdue, timeLeft } from "@/lib/constants";
import { RateAndAdminCard } from "@/components/reports/RateAndAdminCard";
import { useReport, useReportHistory } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Report details — DriveSafe Vision" },
      { name: "description", content: "Full detection results and repair status for your report." },
      { property: "og:title", content: "Report details — DriveSafe Vision" },
      {
        property: "og:description",
        content: "Full detection results and repair status for your report.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { id } = Route.useParams();
  const { data: report, isLoading } = useReport(id);
  const { data: history } = useReportHistory(id);

  if (isLoading) {
    return (
      <UserShell title="Report details">
        <div className="surface-card grid place-items-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Loading report…
        </div>
      </UserShell>
    );
  }

  if (!report) {
    return (
      <UserShell title="Report not found">
        <div className="surface-card grid place-items-center gap-3 p-12 text-center">
          <p className="font-semibold">We couldn&apos;t find that report.</p>
          <Button asChild variant="outline">
            <Link to="/reports">Back to my reports</Link>
          </Button>
        </div>
      </UserShell>
    );
  }

  return (
    <UserShell
      title={report.report_number}
      subtitle={`Submitted ${formatDateTime(report.created_at)}`}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/reports">
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
              {timeLeft(report) && !isOverdue(report) && (
                <span className="text-xs font-medium text-muted-foreground">{timeLeft(report)}</span>
              )}
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
            <h2 className="font-bold">Detection results</h2>
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
            </dl>
          </section>

          <section className="surface-card p-5">
            <h2 className="font-bold">Location &amp; submission</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Submitted by" value={report.submitter_name || report.submitter_email} />
              <Detail label="Submitted" value={formatDateTime(report.created_at)} />
              <Detail label="Address" value={report.address || "Not provided"} />
              <Detail
                label="Coordinates"
                value={
                  report.latitude != null && report.longitude != null
                    ? `${report.latitude}, ${report.longitude}`
                    : "Not captured"
                }
              />
              {report.description && (
                <div className="sm:col-span-2">
                  <Detail label="Your notes" value={report.description} />
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
          <section className="surface-card p-5">
            <h2 className="font-bold">Status timeline</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Status is updated by road maintenance administrators.
            </p>
            <StatusTimeline report={report} events={history ?? []} />
          </section>

          <RateAndAdminCard report={report} />

          {report.repair_image_url && (
            <section className="surface-card p-5">
              <h2 className="font-bold">After repair</h2>
              <StorageImage
                path={report.repair_image_url}
                alt={`After-repair photo for ${report.report_number}`}
                className="mt-3 max-h-64 w-full border border-border"
              />
            </section>
          )}

          {report.admin_notes && (
            <section className="surface-card p-5">
              <h2 className="flex items-center gap-2 font-bold">
                <Info className="size-4 text-primary" aria-hidden="true" /> Administrator notes
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{report.admin_notes}</p>
            </section>
          )}
        </div>
      </div>
    </UserShell>
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
