import { createServerFn } from "@tanstack/react-start";
import { createPublicClient } from "./public-client";
import { assertRequestSucceeded } from "./errors";

/** Anonymous-safe aggregate totals only; public_area_stats enforces the projection. */
export const getAreaStats = createServerFn({ method: "GET" }).handler(async () => {
  const client = createPublicClient(
    process.env["SUPABASE_URL"],
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"],
  );
  const result = await client.rpc("public_area_stats");
  assertRequestSucceeded(result, "Could not load area stats. Please try again.");
  return result.data ?? [];
});