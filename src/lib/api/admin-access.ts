import { assertRequestSucceeded } from "./errors";

type AdminContext = {
  userId: string;
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" },
    ) => PromiseLike<{ data: boolean | null; error: unknown }>;
  };
};

/** Shared fail-closed check, using the authenticated caller's RLS-scoped client. */
export async function assertAdminAccess(context: AdminContext, message: string) {
  const result = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  assertRequestSucceeded(result, "Could not verify administrator access. Please try again.");
  if (!result.data) throw new Error(message);
}