import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordField, passwordScore } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Set a new password — DriveSafe Vision" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Set a new password — DriveSafe Vision" },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => {
      setReady(isRecovery || !!data.session);
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (password.length < 8) next["password"] = "Password must be at least 8 characters.";
    else if (passwordScore(password) < 2) next["password"] = "Add numbers or symbols to strengthen it.";
    if (confirm !== password) next["confirm"] = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.error("Could not update password", { description: error.message });
      return;
    }
    toast.success("Password updated", { description: "You can now use your new password." });
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthLayout
      title="Set a new password"
      description="Choose a strong password you don't use anywhere else."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!ready && (
        <div className="surface-card p-4 text-sm text-muted-foreground">
          Open this page from the reset link in your email. If the link expired, request a new one
          from the{" "}
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            forgot password
          </Link>{" "}
          page.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordField
          id="password"
          label="New password"
          value={password}
          onChange={setPassword}
          error={errors["password"]}
          showStrength
          autoComplete="new-password"
        />
        <PasswordField
          id="confirm"
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          error={errors["confirm"]}
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
