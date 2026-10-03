import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/layout/Shells";
import { ReportsMapView } from "@/components/map/ReportsMapView";
import { useAllReports } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/admin/map")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Complaints map — DriveSafe Vision Admin" },
      { name: "description", content: "Map of pothole complaints coloured by status." },
      { property: "og:title", content: "Complaints map — DriveSafe Vision Admin" },
      { property: "og:description", content: "Map of pothole complaints coloured by status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMapPage,
});

function AdminMapPage() {
  const { data } = useAllReports();
  return (
    <AdminShell title="Map" subtitle="Complaints you can see, coloured by status">
      <ReportsMapView reports={data ?? []} hrefBase="/admin/reports" />
    </AdminShell>
  );
}
