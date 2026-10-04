import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthedContext = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" | "user" },
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
};

async function assertAdmin(context: AuthedContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Administrator access required");
}

export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; status: "Active" | "Suspended" }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own administrator account");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.userId;
    await supabaseAdmin.from("reports").update({ assigned_admin_id: null }).eq("assigned_admin_id", id);
    const steps = [
      supabaseAdmin.from("reports").delete().eq("user_id", id),
      supabaseAdmin.from("notifications").delete().eq("user_id", id),
      supabaseAdmin.from("area_admins").delete().eq("user_id", id),
      supabaseAdmin.from("user_roles").delete().eq("user_id", id),
      supabaseAdmin.from("profiles").delete().eq("id", id),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) throw new Error(error.message);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error && !/not found/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });
