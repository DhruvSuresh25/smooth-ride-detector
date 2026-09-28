import { Link } from "@tanstack/react-router";
import { AlertCircle, MailCheck, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AuthIssue } from "@/lib/auth-errors";

export function AuthIssueAlert({
  issue,
  onResendConfirmation,
  resending = false,
}: {
  issue: AuthIssue;
  onResendConfirmation?: (() => void) | undefined;
  resending?: boolean | undefined;
}) {
  return (
    <Alert variant="destructive" className="pr-4">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{issue.title}</AlertTitle>
      <AlertDescription>
        <p>{issue.message}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {issue.kind === "invalid_credentials" || issue.kind === "account_exists" ? (
            <Button asChild type="button" size="sm" variant="outline">
              <Link to="/forgot-password">
                <RotateCcw aria-hidden="true" /> Reset password
              </Link>
            </Button>
          ) : null}
          {issue.kind === "email_unconfirmed" && onResendConfirmation ? (
            <Button type="button" size="sm" variant="outline" onClick={onResendConfirmation} disabled={resending}>
              <MailCheck aria-hidden="true" /> {resending ? "Sending…" : "Resend confirmation"}
            </Button>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}