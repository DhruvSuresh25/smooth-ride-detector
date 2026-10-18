/** A failed request must never be mistaken for an empty/successful response. */
export function assertRequestSucceeded(
  result: { error: unknown },
  publicMessage: string,
): void {
  if (!result.error) return;
  // Only a category/code is logged: never query payloads, tokens, or personal data.
  const code = typeof result.error === "object" && "code" in result.error
    ? String(result.error.code)
    : "unknown";
  console.error(`[request failed] ${publicMessage} (${code})`);
  throw new Error(publicMessage);
}

/** Converts thrown values to readable feedback, without assuming an Error instance. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}