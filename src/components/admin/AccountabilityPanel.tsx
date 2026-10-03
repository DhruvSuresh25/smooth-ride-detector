import { CLOSED_STATUSES, isOverdue } from "@/lib/constants";
import type { Report } from "@/lib/reports";
import { useAreas } from "@/lib/staff";

type Person = { id: string; full_name: string; email: string };

function onTime(rs: Report[]) {
  const due = rs.filter((r) => r.status === "Fixed" || isOverdue(r) || (r.resolved_at == null && !CLOSED_STATUSES.includes(r.status) && r.deadline_at && new Date(r.deadline_at) < new Date()));
  const ok = rs.filter((r) => r.status === "Fixed" && r.resolved_at && r.deadline_at && r.resolved_at <= r.deadline_at).length;
  return due.length ? Math.round((ok / due.length) * 1000) / 10 : null;
}

export function AccountabilityPanel({ reports, people }: { reports: Report[]; people: Person[] }) {
  const { data: areas } = useAreas();
  const name = (id: string) => {
    const p = people.find((x) => x.id === id);
    return p ? p.full_name || p.email : "Unknown admin";
  };

  const byAdmin = new Map<string, Report[]>();
  for (const r of reports) if (r.assigned_admin_id) byAdmin.set(r.assigned_admin_id, [...(byAdmin.get(r.assigned_admin_id) ?? []), r]);
  const adminRows = [...byAdmin.entries()]
    .map(([id, rs]) => ({ id, name: name(id), total: rs.length, overdue: rs.filter(isOverdue).length, rate: onTime(rs) }))
    .sort((a, b) => b.overdue - a.overdue);

  const areaRows = (areas ?? [])
    .map((a) => {
      const rs = reports.filter((r) => r.area_id === a.id);
      const fixed = rs.filter((r) => r.status === "Fixed" && r.resolved_at);
      const avg = fixed.length
        ? Math.round((fixed.reduce((s, r) => s + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()), 0) / fixed.length / 86400000) * 10) / 10
        : null;
      return { id: a.id, name: a.name, total: rs.length, overdue: rs.filter(isOverdue).length, avg };
    })
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  const months: { label: string; rate: number | null; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const rs = reports.filter((r) => r.deadline_at && new Date(r.deadline_at) >= d && new Date(r.deadline_at) < next);
    months.push({ label: d.toLocaleDateString(undefined, { month: "short" }), rate: onTime(rs), count: rs.length });
  }

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <section className="surface-card p-5">
        <h2 className="font-bold">Overdue by area admin</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-1">Admin</th><th className="text-right">Complaints</th><th className="text-right">Overdue</th><th className="text-right">On time</th></tr>
          </thead>
          <tbody>
            {adminRows.length === 0 && <tr><td colSpan={4} className="py-3 text-muted-foreground">No assigned complaints yet.</td></tr>}
            {adminRows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2">{r.name}</td>
                <td className="text-right">{r.total}</td>
                <td className={r.overdue ? "text-right font-semibold text-sev-critical" : "text-right"}>{r.overdue}</td>
                <td className="text-right">{r.rate != null ? `${r.rate}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="surface-card p-5">
        <h2 className="font-bold">Slowest areas</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-1">Area</th><th className="text-right">Complaints</th><th className="text-right">Overdue</th><th className="text-right">Avg. fix time</th></tr>
          </thead>
          <tbody>
            {areaRows.length === 0 && <tr><td colSpan={4} className="py-3 text-muted-foreground">No areas yet.</td></tr>}
            {areaRows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2">{r.name}</td>
                <td className="text-right">{r.total}</td>
                <td className="text-right">{r.overdue}</td>
                <td className="text-right">{r.avg != null ? `${r.avg} days` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="surface-card p-5 xl:col-span-2">
        <h2 className="font-bold">On-time rate by month (deadline month)</h2>
        <div className="mt-4 flex h-40 items-end gap-3">
          {months.map((m) => (
            <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-semibold">{m.rate != null ? `${m.rate}%` : "—"}</span>
              <div className="w-full rounded-t bg-primary" style={{ height: `${(m.rate ?? 0) * 1.1}px` }} />
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
