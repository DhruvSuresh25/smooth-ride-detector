import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Administrator sign in — DriveSafe Vision" },
      {
        name: "description",
        content: "Road maintenance administrators sign in to review pothole reports.",
      },
      { property: "og:title", content: "Administrator sign in — DriveSafe Vision" },
      {
        property: "og:description",
        content: "Road maintenance administrators sign in to review pothole reports.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setSubmitting(false);
      toast.error("Could not sign in", { description: error?.message });
      return;
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    setSubmitting(false);

    if (!roleRow) {
      toast.error("This account is not an administrator", {
        description: "Signed in as a citizen account instead.",
      });
      navigate({ to: "/dashboard" });
      return;
    }

    toast.success("Administrator signed in");
    navigate({ to: "/admin/dashboard" });
  }

  return (
    <AuthLayout
      title="Administrator sign in"
      description="Restricted to road maintenance staff with an administrator role."
      footer={
        <span>
          Not an administrator?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Citizen sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="admin-email">Work email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            placeholder="admin@roads.gov"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <PasswordField id="admin-password" label="Password" value={password} onChange={setPassword} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Sign In
        </Button>
      </form>

      <div className="surface-card flex gap-3 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
        Administrator accounts are granted server-side and are never listed here. See the project
        README for the secure setup steps.
      </div>
    </AuthLayout>
  );
}
