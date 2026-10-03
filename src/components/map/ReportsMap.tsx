import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  status: string;
  href?: string;
};

// Map pins need literal colours; these mirror the status badge palette.
const STATUS_COLOR: Record<string, string> = {
  Submitted: "#ca8a04",
  Received: "#2563eb",
  "In Progress": "#7c3aed",
  Fixed: "#16a34a",
  Rejected: "#6b7280",
  Duplicate: "#6b7280",
  Overdue: "#dc2626",
};
export const MAP_LEGEND = STATUS_COLOR;

type LeafletNS = typeof import("leaflet");

/** Client-only Leaflet map. Pass onPick to let the user drop a pin. */
export function ReportsMap({
  points = [],
  pick,
  onPick,
  height = 420,
}: {
  points?: MapPoint[];
  pick?: { lat: number; lng: number } | null;
  onPick?: (p: { lat: number; lng: number }) => void;
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const L = useRef<LeafletNS | null>(null);
  const layer = useRef<import("leaflet").LayerGroup | null>(null);
  const pickMarker = useRef<import("leaflet").CircleMarker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Lf = (mod as unknown as { default?: LeafletNS }).default ?? mod;
      L.current = Lf;
      const m = Lf.map(el.current).setView([20.59, 78.96], 5);
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(m);
      layer.current = Lf.layerGroup().addTo(m);
      m.on("click", (e) => onPickRef.current?.({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }));
      map.current = m;
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const Lf = L.current;
    const m = map.current;
    if (!Lf || !m || !layer.current) return;
    layer.current.clearLayers();
    const bounds: [number, number][] = [];
    for (const p of points) {
      const color = STATUS_COLOR[p.status] ?? "#2563eb";
      const marker = Lf.circleMarker([p.lat, p.lng], { radius: 8, color, fillColor: color, fillOpacity: 0.8, weight: 2 });
      const html = p.href ? `<a href="${p.href}">${escapeHtml(p.label)}</a><br/>${p.status}` : `${escapeHtml(p.label)}<br/>${p.status}`;
      marker.bindPopup(html).addTo(layer.current);
      bounds.push([p.lat, p.lng]);
    }
    pickMarker.current?.remove();
    if (pick) {
      pickMarker.current = Lf.circleMarker([pick.lat, pick.lng], { radius: 10, color: "#dc2626", weight: 3 }).addTo(m);
      bounds.push([pick.lat, pick.lng]);
    }
    if (bounds.length === 1) m.setView(bounds[0]!, 16);
    else if (bounds.length > 1) m.fitBounds(bounds, { padding: [30, 30] });
  }

  useEffect(draw, [points, pick]);

  return <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-lg border border-border" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
