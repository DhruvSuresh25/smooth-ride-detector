import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function SuperAdminInvites() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: supers = [] } = useQuery({
    queryKey: ["super-admins"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (error) throw error;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return data ?? [];
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["super-admin-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("super_admin_invites")
        .select("id, email, created_at, accepted_at, declined_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function invite() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error("Enter a valid email address"); return; }
    if (supers.some((s) => s.email.toLowerCase() === e)) { toast.error("That person is already a super admin"); return; }
    setSaving(true);
    const { error } = await supabase.from("super_admin_invites").insert({ email: e, invited_by: user!.id });
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "An invitation is already waiting for that email" : error.message);
      return;
    }
    setEmail("");
    toast.success("Invitation sent", { description: "They'll see it in the app after signing in with that email." });
    void qc.invalidateQueries({ queryKey: ["super-admin-invites"] });
  }

  async function cancel(id: string) {
    const { error } = await supabase.from("super_admin_invites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void qc.invalidateQueries({ queryKey: ["super-admin-invites"] });
  }

  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Crown className="size-5 text-primary" aria-hidden="true" />
        <h2 className="font-semibold">Super admins</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Enter someone's email to invite them. Once they sign in with that email and accept, they get
        full super admin access.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
        <Button onClick={() => void invite()} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Send invitation
        </Button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Current super admins</h3>
        <ul className="space-y-1 text-sm">
          {supers.map((s) => (
            <li key={s.id}>
              {s.full_name || s.email} <span className="text-muted-foreground">· {s.email}</span>
            </li>
          ))}
        </ul>
      </div>

      {invites.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Invitations</h3>
          <ul className="space-y-2 text-sm">
            {invites.map((i) => {
              const state = i.accepted_at ? "Accepted" : i.declined_at ? "Declined" : "Waiting";
              return (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{i.email}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={state === "Accepted" ? "default" : "secondary"}>{state}</Badge>
                    {state === "Waiting" && (
                      <Button size="icon" variant="ghost" aria-label="Cancel invitation" onClick={() => void cancel(i.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export function SuperAdminInviteBanner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const { data: invite } = useQuery({
    queryKey: ["my-super-invite", user?.id],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("super_admin_invites")
        .select("id")
        .ilike("email", user!.email!)
        .is("accepted_at", null)
        .is("declined_at", null)
        .maybeSingle();
      return data;
    },
  });
  if (!invite) return null;

  async function respond(accept: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("respond_super_admin_invite", { _id: invite!.id, _accept: accept });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? "You are now a super admin" : "Invitation declined");
    await qc.invalidateQueries();
    if (accept) window.location.assign("/admin/dashboard");
  }

  return (
    <div className="flex flex-col gap-3 border-b border-primary/20 bg-primary-soft px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span className="flex items-center gap-2 font-medium text-primary">
        <Crown className="size-4" aria-hidden="true" /> You've been invited to become a super admin.
      </span>
      <span className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => void respond(true)}>Accept</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void respond(false)}>Decline</Button>
      </span>
    </div>
  );
}
