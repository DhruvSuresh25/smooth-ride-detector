import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/Shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  createAreaAdmin,
  deleteAreaAdmin,
  setAreaAdminStatus,
  updateAreaAdmin,
} from "@/lib/area-admins.functions";
import { bandClasses, formatRate, formatRating, performanceBand, useAreas, usePerformance, useThresholds, type Area } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/admin/area-admins")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Area Admins — DriveSafe Vision" },
      { name: "description", content: "Manage areas, area admins and their performance." },
      { property: "og:title", content: "Area Admins — DriveSafe Vision" },
      { property: "og:description", content: "Manage areas, area admins and their performance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AreaAdminsPage,
});

type AreaAdminRow = {
  user_id: string;
  full_name: string;
  email: string;
  account_status: string;
  areaIds: string[];
};

function useAreaAdmins() {
  return useQuery({
    queryKey: ["area-admins"],
    queryFn: async (): Promise<AreaAdminRow[]> => {
      const [{ data: admins, error }, { data: links }] = await Promise.all([
        supabase.from("area_admins").select("user_id").order("created_at"),
        supabase.from("area_admin_areas").select("admin_id, area_id"),
      ]);
      if (error) throw error;
      const ids = (admins ?? []).map((a) => a.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, account_status")
        .in("id", ids);
      return ids.map((id) => {
        const p = profiles?.find((x) => x.id === id);
        return {
          user_id: id,
          full_name: p?.full_name ?? "",
          email: p?.email ?? "",
          account_status: p?.account_status ?? "Active",
          areaIds: (links ?? []).filter((l) => l.admin_id === id).map((l) => l.area_id),
        };
      });
    },
  });
}

function AreaAdminsPage() {
  const { data: areas } = useAreas();
  const { data: admins, isLoading } = useAreaAdmins();
  const [creating, setCreating] = useState(false);

  return (
    <AdminShell
      superOnly
      title="Area admins"
      subtitle="Create area admins, assign areas and track performance"
      actions={
        <Button size="sm" onClick={() => (areas?.length ? setCreating(true) : toast.error("Add an area first", { description: "Type an area name in the Areas box on the left and press Add, then add the admin." }))}>
          <Plus className="size-4" aria-hidden="true" /> Add admin by email
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <AreasCard areas={areas ?? []} />
        <section className="space-y-3" aria-label="Area admins">
          {isLoading ? (
            <div className="surface-card grid place-items-center p-10">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : admins?.length ? (
            admins.map((a) => (
              <AdminCard key={a.user_id} admin={a} areas={areas ?? []} others={admins} />
            ))
          ) : (
            <div className="surface-card p-10 text-center text-sm text-muted-foreground">
              No area admins yet. Add an area first, then create an area admin.
            </div>
          )}
        </section>
      </div>
      {creating && <AdminFormDialog areas={areas ?? []} onClose={() => setCreating(false)} />}
    </AdminShell>
  );
}

function AreasCard({ areas }: { areas: Area[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    const { error } = await supabase.from("areas").insert({ name: n.slice(0, 100) });
    setBusy(false);
    if (error) return void toast.error("Could not add area", { description: error.message });
    setName("");
    void qc.invalidateQueries({ queryKey: ["areas"] });
  }

  async function remove(a: Area) {
    if (!confirm(`Delete area "${a.name}"? Complaints in it stay but become unassigned to an area.`))
      return;
    const { error } = await supabase.from("areas").delete().eq("id", a.id);
    if (error) return void toast.error("Could not delete area", { description: error.message });
    void qc.invalidateQueries({ queryKey: ["areas"] });
    void qc.invalidateQueries({ queryKey: ["area-admins"] });
  }

  return (
    <section className="surface-card h-fit p-5">
      <h2 className="font-bold">Areas</h2>
      <div className="mt-3 flex gap-2">
        <Input
          aria-label="New area name"
          placeholder="e.g. Ward 12 – Indiranagar"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void add()}
        />
        <Button onClick={add} disabled={busy || !name.trim()}>
          Add
        </Button>
      </div>
      <ul className="mt-4 space-y-2">
        {areas.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            {a.name}
            <Button variant="ghost" size="icon" aria-label={`Delete ${a.name}`} onClick={() => remove(a)}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
        {!areas.length && <li className="text-sm text-muted-foreground">No areas yet.</li>}
      </ul>
    </section>
  );
}

function AdminCard({
  admin,
  areas,
  others,
}: {
  admin: AreaAdminRow;
  areas: Area[];
  others: AreaAdminRow[];
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: perf } = usePerformance(admin.user_id);
  const { data: thresholds } = useThresholds();
  const band = performanceBand(perf, thresholds);
  const setStatus = useServerFn(setAreaAdminStatus);
  const del = useServerFn(deleteAreaAdmin);
  const [editing, setEditing] = useState(false);
  const [warning, setWarning] = useState(false);
  const [reassign, setReassign] = useState(false);
  const suspended = admin.account_status === "Suspended";
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["area-admins"] });
    void qc.invalidateQueries({ queryKey: ["performance"] });
    void qc.invalidateQueries({ queryKey: ["reports"] });
  };

  async function toggleSuspend() {
    const res = await setStatus({
      data: { userId: admin.user_id, status: suspended ? "Active" : "Suspended" },
    });
    if (!res.ok) return void toast.error("Could not update", { description: res.error });
    toast.success(suspended ? "Admin reactivated" : "Admin suspended");
    refresh();
  }

  async function remove() {
    if (!confirm(`Remove ${admin.full_name || admin.email} as an admin? Their account stays as a normal citizen account, and their complaints become unassigned.`))
      return;
    const res = await del({ data: { userId: admin.user_id } });
    if (!res.ok) return void toast.error("Could not delete", { description: res.error });
    toast.success("Admin removed");
    refresh();
  }

  return (
    <article className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{admin.full_name || "Unnamed admin"}</p>
          <p className="text-sm text-muted-foreground">{admin.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {admin.areaIds.map((id) => (
              <Badge key={id} variant="outline">
                {areas.find((a) => a.id === id)?.name ?? "Area"}
              </Badge>
            ))}
            {!admin.areaIds.length && <Badge variant="outline">No areas</Badge>}
            {suspended && <Badge variant="destructive">Suspended</Badge>}
            {band && (
              <Badge variant="outline" className={bandClasses[band]}>
                {band} performance
              </Badge>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <Stat label="On-time rate" value={formatRate(perf)} />
          <Stat label="Avg rating" value={formatRating(perf)} />
          <Stat label="Overdue" value={String(perf?.overdue ?? 0)} />
        </dl>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
        <Button size="sm" variant="outline" onClick={() => setWarning(true)}>Warn</Button>
        <Button size="sm" variant="outline" onClick={() => setReassign(true)}>Reassign complaints</Button>
        <Button size="sm" variant="outline" onClick={toggleSuspend}>
          {suspended ? "Reactivate" : "Suspend"}
        </Button>
        <Button size="sm" variant="destructive" onClick={remove} disabled={admin.user_id === user?.id}>
          Remove admin
        </Button>
      </div>
      {editing && <AdminFormDialog areas={areas} admin={admin} onClose={() => setEditing(false)} />}
      {warning && <WarnDialog admin={admin} onClose={() => setWarning(false)} />}
      {reassign && (
        <ReassignDialog admin={admin} others={others} onClose={() => setReassign(false)} onDone={refresh} />
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function AdminFormDialog({
  areas,
  admin,
  onClose,
}: {
  areas: Area[];
  admin?: AreaAdminRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createAreaAdmin);
  const update = useServerFn(updateAreaAdmin);
  const [fullName, setFullName] = useState(admin?.full_name ?? "");
  const [email, setEmail] = useState("");
  const [areaIds, setAreaIds] = useState<string[]>(admin?.areaIds ?? []);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (admin && !fullName.trim()) return void toast.error("Name is required");
    if (!admin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return void toast.error("Enter a valid email address");
    setBusy(true);
    try {
      const res = admin
        ? await update({ data: { userId: admin.user_id, fullName, areaIds } })
        : await create({ data: { email: email.trim(), fullName, areaIds } });
      if (!res.ok) return void toast.error("Could not save", { description: res.error });
      toast.success(admin ? "Area admin updated" : "Area admin added", {
        description: admin
          ? undefined
          : "emailSent" in res && res.emailSent
            ? "An email telling them they've been selected is on its way."
            : "They were added, but the email couldn't be sent right now.",
      });
      void qc.invalidateQueries({ queryKey: ["area-admins"] });
      onClose();
    } catch (e) {
      toast.error("Could not save", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{admin ? "Edit area admin" : "New area admin"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="aa-name">Full name{admin ? "" : " (optional)"}</Label>
            <Input id="aa-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          {!admin && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="aa-email">Email</Label>
                <Input id="aa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll email them that they've been selected as an admin of DriveSafe Vision, with a
                button to set their own password and sign in to the admin portal.
              </p>
            </>
          )}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Assigned areas</legend>
            {areas.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={areaIds.includes(a.id)}
                  onCheckedChange={(c) =>
                    setAreaIds((prev) => (c ? [...prev, a.id] : prev.filter((x) => x !== a.id)))
                  }
                />
                {a.name}
              </label>
            ))}
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WarnDialog({ admin, onClose }: { admin: AreaAdminRow; onClose: () => void }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  async function send() {
    const m = message.trim();
    if (!m) return;
    const { error } = await supabase
      .from("admin_warnings")
      .insert({ admin_id: admin.user_id, message: m.slice(0, 1000), created_by: user?.id ?? null });
    if (error) return void toast.error("Could not send warning", { description: error.message });
    toast.success("Warning sent", { description: "They will see it on their overview page." });
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Warn {admin.full_name || admin.email}</DialogTitle>
        </DialogHeader>
        <Textarea rows={4} maxLength={1000} placeholder="e.g. 3 complaints in your area are overdue." value={message} onChange={(e) => setMessage(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={!message.trim()}>Send warning</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReassignDialog({
  admin,
  others,
  onClose,
  onDone,
}: {
  admin: AreaAdminRow;
  others: AreaAdminRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [target, setTarget] = useState("");
  const choices = others.filter((o) => o.user_id !== admin.user_id && o.account_status === "Active");
  async function go() {
    if (!target) return;
    const { data, error } = await supabase
      .from("reports")
      .update({ assigned_admin_id: target })
      .eq("assigned_admin_id", admin.user_id)
      .not("status", "in", "(Fixed,Rejected,Duplicate)")
      .select("id");
    if (error) return void toast.error("Could not reassign", { description: error.message });
    toast.success(`${data?.length ?? 0} open complaint(s) reassigned`);
    onDone();
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign open complaints</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Move every open complaint from {admin.full_name || admin.email} to another area admin.
        </p>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger aria-label="New admin"><SelectValue placeholder="Choose an admin" /></SelectTrigger>
          <SelectContent>
            {choices.map((c) => (
              <SelectItem key={c.user_id} value={c.user_id}>{c.full_name || c.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={go} disabled={!target}>Reassign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
