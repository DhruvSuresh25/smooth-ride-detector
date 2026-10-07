import { MAP_LEGEND, ReportsMap, type MapPoint } from "@/components/map/ReportsMap";
import { isOverdue } from "@/lib/constants";
import type { Report } from "@/lib/reports";

export function ReportsMapView({ reports, hrefBase }: { reports: Report[]; hrefBase: string }) {
  const points: MapPoint[] = reports
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: r.id,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      label: `${r.report_number} · ${r.severity}`,
      status: isOverdue(r) ? "Overdue" : r.status,
      href: `${hrefBase}/${r.id}`,
    }));
  const missing = reports.length - points.length;

  return (
    <section className="surface-card space-y-3 p-5">
      <ReportsMap points={points} height={520} />
      {points.length === 0 && (
        <p className="rounded-lg bg-muted/60 p-3 text-center text-sm text-muted-foreground">
          {reports.length === 0
            ? "No reports here yet — they will appear on the map as soon as one comes in."
            : "None of these reports have a GPS location, so there are no pins to show."}
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(MAP_LEGEND).map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
      {missing > 0 && (
        <p className="text-xs text-muted-foreground">
          {missing} complaint(s) have no GPS location and are not shown.
        </p>
      )}
    </section>
  );
}
