import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthIssueAlert } from "@/components/auth/AuthIssueAlert";
import { PasswordField } from "@/components/auth/PasswordField";
import { SignInAssistant } from "@/components/auth/SignInAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getAuthIssue, type AuthIssue } from "@/lib/auth-errors";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Sign in — DriveSafe Vision" },
      { name: "description", content: "Sign in to submit and track pothole reports." },
      { property: "og:title", content: "Sign in — DriveSafe Vision" },
      { property: "og:description", content: "Sign in to submit and track pothole reports." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s["next"] === "string" && /^\/(?![\/\\])[^\\\s]*$/.test(s["next"])
      ? { next: s["next"] }
      : {},
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { next: nextPath } = Route.useSearch();
  const goNext = () =>
    nextPath && new URL(nextPath, window.location.origin).origin === window.location.origin
      ? (window.location.href = new URL(nextPath, window.location.origin).href) : navigate({ to: "/dashboard", replace: true });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authIssue, setAuthIssue] = useState<AuthIssue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user) void goNext();
  }, [user, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next["email"] = "Enter a valid email address.";
    if (!password) next["password"] = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setAuthIssue(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session || !data.user) {
        setAuthIssue(getAuthIssue(error));
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profileError && profile?.account_status === "suspended") {
        await supabase.auth.signOut();
        setAuthIssue(getAuthIssue({ code: "user_banned" }));
        return;
      }

      toast.success("Welcome back");
      await goNext();
    } catch (error) {
      setAuthIssue(getAuthIssue(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendConfirmation() {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    setResending(false);
    if (error) {
      setAuthIssue(getAuthIssue(error));
      return;
    }
    toast.success("Confirmation email sent", { description: "Check your inbox and spam folder." });
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Access your reports and submit new road assessments."
      footer={
        <span>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setAuthIssue(null);
            }}
            aria-invalid={!!errors["email"]}
          />
          {errors["email"] && <p className="text-xs font-medium text-destructive">{errors["email"]}</p>}
        </div>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setAuthIssue(null);
          }}
          error={errors["password"]}
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {authIssue ? (
          <AuthIssueAlert
            issue={authIssue}
            onResendConfirmation={authIssue.kind === "email_unconfirmed" ? resendConfirmation : undefined}
            resending={resending}
          />
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Sign In
        </Button>
      </form>

      <SignInAssistant issue={authIssue} />

      <p className="text-sm text-muted-foreground">
        Road maintenance staff can{" "}
        <Link to="/admin/login" className="font-medium text-primary hover:underline">
          sign in to the admin portal
        </Link>
        .
      </p>
    </AuthLayout>
  );
}
