import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — DriveSafe Vision" },
      { name: "description", content: "Request a password reset link for your account." },
      { property: "og:title", content: "Reset your password — DriveSafe Vision" },
      { property: "og:description", content: "Request a password reset link for your account." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (resetError) {
      toast.error("Could not send reset link", { description: resetError.message });
      return;
    }
    setSent(true);
    toast.success("Reset link sent");
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        description={`If an account exists for ${email}, a password reset link is on its way.`}
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="surface-card flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <MailCheck className="size-5 text-primary" aria-hidden="true" />
          The link expires after a short time. Request another if it stops working.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to set a new one."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
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
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
          />
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
