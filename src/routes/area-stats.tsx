import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { Logo } from "@/components/brand/Logo";
import type { Database } from "@/integrations/supabase/types";

const getAreaStats = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.rpc("public_area_stats");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const Route = createFileRoute("/area-stats")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Road repair stats by area — DriveSafe Vision" },
      { name: "description", content: "Pothole complaints filed and fixed per area, with on-time repair rates and citizen ratings." },
      { property: "og:title", content: "Road repair stats by area — DriveSafe Vision" },
      { property: "og:description", content: "Pothole complaints filed and fixed per area, with on-time repair rates and citizen ratings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => getAreaStats(),
  errorComponent: () => <p className="p-10 text-center">Could not load area stats. Please try again.</p>,
  notFoundComponent: () => <p className="p-10 text-center">Not found.</p>,
  component: AreaStatsPage,
});

function AreaStatsPage() {
  const rows = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
        <Logo to="/" />
        <Link to="/login" className="text-sm font-semibold text-primary">Sign in</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Road repair stats by area</h1>
        <p className="mt-2 text-sm text-muted-foreground">Totals only — no personal details are shown.</p>
        <div className="mt-6 overflow-x-auto surface-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-3">Area</th>
                <th className="p-3 text-right">Filed</th>
                <th className="p-3 text-right">Fixed</th>
                <th className="p-3 text-right">Avg. fix time</th>
                <th className="p-3 text-right">On-time rate</th>
                <th className="p-3 text-right">Avg. rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No areas set up yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.area_name} className="border-b border-border last:border-0">
                  <td className="p-3 font-semibold">{r.area_name}</td>
                  <td className="p-3 text-right">{r.filed}</td>
                  <td className="p-3 text-right">{r.fixed}</td>
                  <td className="p-3 text-right">{r.avg_fix_days != null ? `${r.avg_fix_days} days` : "—"}</td>
                  <td className="p-3 text-right">{r.on_time_rate != null ? `${r.on_time_rate}%` : "—"}</td>
                  <td className="p-3 text-right">{r.avg_rating != null ? `${r.avg_rating} / 5` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
