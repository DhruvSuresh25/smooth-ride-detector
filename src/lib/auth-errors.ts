export type AuthIssueKind =
  | "invalid_credentials"
  | "email_unconfirmed"
  | "account_suspended"
  | "rate_limited"
  | "network"
  | "account_exists"
  | "weak_password"
  | "unexpected";

export type AuthIssue = {
  kind: AuthIssueKind;
  title: string;
  message: string;
};

type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export function getAuthIssue(error: unknown, action: "sign-in" | "sign-up" = "sign-in"): AuthIssue {
  const authError = error && typeof error === "object" ? (error as AuthErrorLike) : {};
  const code = authError.code?.toLowerCase() ?? "";
  const message = authError.message?.toLowerCase() ?? "";

  if (code.includes("email_not_confirmed") || message.includes("email not confirmed")) {
    return {
      kind: "email_unconfirmed",
      title: "Confirm your email first",
      message: "Open the confirmation link we sent to your email, then return here to sign in.",
    };
  }

  if (
    code.includes("invalid_credentials") ||
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return {
      kind: "invalid_credentials",
      title: "Email or password not recognized",
      message: "Check the email address and password, or reset your password if you cannot remember it.",
    };
  }

  if (code.includes("user_banned") || message.includes("banned") || message.includes("suspended")) {
    return {
      kind: "account_suspended",
      title: "Account access is suspended",
      message: "Contact a road-maintenance administrator to restore access to this account.",
    };
  }

  if (authError.status === 429 || code.includes("rate_limit") || message.includes("too many requests")) {
    return {
      kind: "rate_limited",
      title: "Too many attempts",
      message: "Wait a few minutes before trying again. Avoid repeatedly submitting the form.",
    };
  }

  if (code.includes("user_already_exists") || message.includes("already registered")) {
    return {
      kind: "account_exists",
      title: "An account may already exist",
      message: "Try signing in with this email, or reset the password if you no longer remember it.",
    };
  }

  if (code.includes("weak_password") || message.includes("password should be")) {
    return {
      kind: "weak_password",
      title: "Choose a stronger password",
      message: "Use at least 8 characters and avoid common or compromised passwords.",
    };
  }

  if (
    error instanceof TypeError ||
    code.includes("network") ||
    message.includes("fetch") ||
    message.includes("network")
  ) {
    return {
      kind: "network",
      title: "Connection problem",
      message: "Check your internet connection and try again. Your details have not been changed.",
    };
  }

  return {
    kind: "unexpected",
    title: action === "sign-up" ? "Account could not be created" : "Sign-in could not be completed",
    message: "Please try again. If the problem continues, use the sign-in assistant below.",
  };
}