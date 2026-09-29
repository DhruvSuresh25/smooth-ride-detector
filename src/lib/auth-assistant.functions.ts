import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AuthIssueKind } from "./auth-errors";

const issueKinds = [
  "invalid_credentials",
  "email_unconfirmed",
  "account_suspended",
  "rate_limited",
  "network",
  "account_exists",
  "weak_password",
  "unexpected",
] as const satisfies readonly AuthIssueKind[];

export const askSignInAssistant = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        description: z.string().trim().min(10).max(1200),
        issueKind: z.enum(issueKinds).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { createHash } = await import("crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = getRequest();
    const ip =
      req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const clientHash = createHash("sha256").update(`drivesafe-assist:${ip}`).digest("hex");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("ai_assist_usage")
      .select("id", { count: "exact", head: true })
      .eq("client_hash", clientHash)
      .gte("created_at", since);
    if (countError) return { ok: false as const, error: "Sign-in help is unavailable right now. Please try again shortly." };
    if ((count ?? 0) >= 5) {
      return { ok: false as const, error: "You've asked for help several times. Please wait an hour or use Forgot password." };
    }
    await supabaseAdmin.from("ai_assist_usage").insert({ client_hash: clientHash });
    const { getAuthRecoveryGuidance } = await import("./auth-assistant.server.ts");
    return getAuthRecoveryGuidance(data.description, data.issueKind);
  });