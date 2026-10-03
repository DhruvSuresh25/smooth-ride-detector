import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/layout/Shells";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Audit log — DriveSafe Vision Admin" },
      { name: "description", content: "Record of role changes, admin actions and deadline changes." },
      { property: "og:title", content: "Audit log — DriveSafe Vision Admin" },
      { property: "og:description", content: "Record of role changes, admin actions and deadline changes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const { data } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("audit_log")
        .select("id, actor_id, action, details, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email]));
      return (rows ?? []).map((r) => ({ ...r, actor: r.actor_id ? names.get(r.actor_id) ?? "Unknown user" : "System" }));
    },
  });

  return (
    <AdminShell superOnly title="Audit log" subtitle="Latest 200 critical actions">
      <section className="surface-card divide-y divide-border">
        {(data ?? []).length === 0 && <p className="p-6 text-sm text-muted-foreground">No actions recorded yet.</p>}
        {(data ?? []).map((r) => (
          <details key={r.id} className="p-4">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold capitalize">{r.action.replaceAll("_", " ")}</span>
              <span className="text-muted-foreground">
                {r.actor} · {formatDateTime(r.created_at)}
              </span>
            </summary>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(r.details, null, 2)}</pre>
          </details>
        ))}
      </section>
    </AdminShell>
  );
}
