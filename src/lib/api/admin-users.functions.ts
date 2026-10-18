import { z } from "zod";
import { assertAdminAccess } from "./admin-access";
import { assertRequestSucceeded } from "./errors";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), status: z.enum(["Active", "Suspended"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context, "Administrator access required");
    if (data.userId === context.userId) {
      throw new Error("You cannot suspend your own administrator account");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: data.status })
      .eq("id", data.userId);
    assertRequestSucceeded({ error }, "Could not update the account. Some changes may have completed; refresh before retrying.");
    assertRequestSucceeded(await supabaseAdmin.rpc("log_audit", {
      _actor: context.userId,
      _action: "Account status changed",
      _details: { user: data.userId, to: data.status },
    }), "Account updated, but its audit entry could not be recorded. Refresh before retrying.");
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context, "Administrator access required");
    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own administrator account");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.userId;
    assertRequestSucceeded(await supabaseAdmin.from("reports").update({ assigned_admin_id: null }).eq("assigned_admin_id", id), "Could not unassign this account’s reports. No account deletion was attempted.");
    const steps = [
      supabaseAdmin.from("reports").delete().eq("user_id", id),
      supabaseAdmin.from("notifications").delete().eq("user_id", id),
      supabaseAdmin.from("area_admins").delete().eq("user_id", id),
      supabaseAdmin.from("user_roles").delete().eq("user_id", id),
      supabaseAdmin.from("profiles").delete().eq("id", id),
    ];
    for (const step of steps) {
      const { error } = await step;
      assertRequestSucceeded({ error }, "Could not update the account. Some changes may have completed; refresh before retrying.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error && !/not found/i.test(error.message)) {
      assertRequestSucceeded({ error }, "Account cleanup completed, but account deletion failed. Refresh before retrying.");
    }
    return { ok: true };
  });
