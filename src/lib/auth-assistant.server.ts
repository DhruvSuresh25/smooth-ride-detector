import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import type { AuthIssueKind } from "./auth-errors";
import { createLovableAiGatewayRunIdFetch } from "./ai/run-id.server.ts";

const MODEL = "openai/gpt-6-astra";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

function redactSensitiveText(value: string) {
  return value
    .replace(/\b(password|passcode|token|secret)\s*(?:is|:|=)\s*[^\s,;]+/gi, "$1: [redacted]")
    .replace(/\b(?:eyJ[a-zA-Z0-9_-]{10,}|sb_(?:secret|publishable)_[a-zA-Z0-9_-]+)\b/g, "[redacted]")
    .slice(0, 1200);
}

function safeGatewayMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Sign-in guidance is temporarily unavailable. Use password reset or try again shortly.";
}

export async function getAuthRecoveryGuidance(description: string, issueKind: AuthIssueKind | null) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { ok: false as const, error: "AI guidance is not configured for this app." };
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      system: `You are the DriveSafe Vision sign-in recovery assistant. Help a citizen resolve an email/password authentication problem safely.

Rules:
- Give a short likely-cause summary followed by 2–4 numbered recovery steps.
- Use only these actions when relevant: check email spelling, retry carefully, confirm email using the inbox link, use Forgot password, wait after too many attempts, check internet connection, or contact a road-maintenance administrator for a suspended account.
- Never claim to know whether an account exists, whether a password is correct, or whether an email is registered.
- Never request a password, one-time code, session token, API key, or other credential.
- Never advise creating another account to bypass a restriction.
- Keep the answer under 130 words and use plain text without markdown headings.`,
      prompt: `Known app error category: ${issueKind ?? "none"}\nCitizen's description: ${redactSensitiveText(description)}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = (await result.text).trim();
    if (!text) return { ok: false as const, error: "AI guidance returned no response. Please try again." };
    return { ok: true as const, guidance: text, runId: runIdFetch.getRunId() };
  } catch (error) {
    return { ok: false as const, error: safeGatewayMessage(error) };
  }
}