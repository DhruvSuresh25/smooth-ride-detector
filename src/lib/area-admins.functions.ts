import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" | "user" },
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
};

async function assertSuper(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Super admin access required");
}

const uuid = z.string().uuid();

export const createAreaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        fullName: z.string().trim().min(1).max(100),
        password: z.string().min(8).max(72),
        areaIds: z.array(uuid).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuper(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) {
      return { ok: false as const, error: error?.message ?? "Could not create the account" };
    }
    const id = created.user.id;
    await supabaseAdmin.from("profiles").upsert({ id, full_name: data.fullName, email: data.email });
    const { error: aErr } = await supabaseAdmin
      .from("area_admins")
      .insert({ user_id: id, created_by: context.userId });
    if (aErr) return { ok: false as const, error: aErr.message };
    if (data.areaIds.length) {
      await supabaseAdmin
        .from("area_admin_areas")
        .insert(data.areaIds.map((area_id) => ({ admin_id: id, area_id })));
    }
    return { ok: true as const, id };
  });

export const updateAreaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: uuid,
        fullName: z.string().trim().min(1).max(100),
        areaIds: z.array(uuid).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuper(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: exists } = await supabaseAdmin
      .from("area_admins")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!exists) return { ok: false as const, error: "That account is not an area admin" };
    await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", data.userId);
    await supabaseAdmin.from("area_admin_areas").delete().eq("admin_id", data.userId);
    if (data.areaIds.length) {
      await supabaseAdmin
        .from("area_admin_areas")
        .insert(data.areaIds.map((area_id) => ({ admin_id: data.userId, area_id })));
    }
    return { ok: true as const };
  });

export const setAreaAdminStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: uuid, status: z.enum(["Active", "Suspended"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuper(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: data.status })
      .eq("id", data.userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteAreaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuper(context);
    if (data.userId === context.userId) {
      return { ok: false as const, error: "You cannot delete your own account" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: exists } = await supabaseAdmin
      .from("area_admins")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!exists) return { ok: false as const, error: "That account is not an area admin" };
    // Complaints stay; they simply become unassigned.
    await supabaseAdmin
      .from("reports")
      .update({ assigned_admin_id: null })
      .eq("assigned_admin_id", data.userId);
    await supabaseAdmin.from("area_admins").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
