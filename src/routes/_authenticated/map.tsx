import { createFileRoute } from "@tanstack/react-router";

import { UserShell } from "@/components/layout/Shells";
import { ReportsMapView } from "@/components/map/ReportsMapView";
import { useMyReports } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/map")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "My complaints map — DriveSafe Vision" },
      { name: "description", content: "Map of your pothole complaints coloured by status." },
      { property: "og:title", content: "My complaints map — DriveSafe Vision" },
      { property: "og:description", content: "Map of your pothole complaints coloured by status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyMapPage,
});

function MyMapPage() {
  const { data } = useMyReports();
  return (
    <UserShell title="Map" subtitle="Your complaints, coloured by status">
      <ReportsMapView reports={data ?? []} hrefBase="/reports" />
    </UserShell>
  );
}
