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
    const { getAuthRecoveryGuidance } = await import("./auth-assistant.server.ts");
    return getAuthRecoveryGuidance(data.description, data.issueKind);
  });