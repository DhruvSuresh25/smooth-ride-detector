import { APP_ORIGIN } from "@/config/app";
import { assertAdminAccess } from "./admin-access";
import { assertRequestSucceeded } from "./errors";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


const uuid = z.string().uuid();

export const createAreaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        fullName: z.string().trim().min(1, "A name is required").max(100),
        areaIds: z.array(uuid).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context, "Super admin access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const site = APP_ORIGIN;

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .ilike("email", data.email)
      .maybeSingle();

    assertRequestSucceeded({ error: lookupError }, "Could not look up the account.");
    let id = existing?.id;
    let actionUrl = `${site}/admin/login`;
    const fullName = data.fullName || existing?.full_name || "";

    if (!id) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error || !created.user) {
        return { ok: false as const, error: "Could not create the account. Please try again." };
      }
      id = created.user.id;
      assertRequestSucceeded(await supabaseAdmin.from("profiles").upsert({ id, full_name: fullName, email: data.email }), "Account created, but its profile could not be saved. Refresh before retrying.");
    }
    // Everyone gets a link in the email to set their own password for the admin portal.
    {
      const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: { redirectTo: `${site}/reset-password` },
      });
      assertRequestSucceeded({ error: linkError }, "Could not create the password-setup link.");
      if (link?.properties?.action_link) actionUrl = link.properties.action_link;
    }

    const { data: already, error: alreadyError } = await supabaseAdmin
      .from("area_admins").select("user_id").eq("user_id", id).maybeSingle();
    assertRequestSucceeded({ error: alreadyError }, "Could not check area-admin status.");
    if (already) return { ok: false as const, error: "That person is already an area admin" };

    const { error: aErr } = await supabaseAdmin
      .from("area_admins")
      .insert({ user_id: id, created_by: context.userId });
    assertRequestSucceeded({ error: aErr }, "Could not add the area admin.");
    if (data.areaIds.length) {
      const adminId = id;
      assertRequestSucceeded(await supabaseAdmin
        .from("area_admin_areas")
        .insert(data.areaIds.map((area_id) => ({ admin_id: adminId, area_id }))), "Admin created, but area assignment failed. Refresh before retrying.");
    }

    let areaNames = "";
    if (data.areaIds.length) {
      const { data: rows, error: areasError } = await supabaseAdmin.from("areas").select("name").in("id", data.areaIds);
      assertRequestSucceeded({ error: areasError }, "Could not load assigned area names.");
      areaNames = (rows ?? []).map((r) => r.name).join(", ");
    }

    let emailSent = false;
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const r = await sendTemplateEmail("area-admin-selected", data.email, {
        templateData: { name: fullName || undefined, areas: areaNames || undefined, actionUrl, newAccount: true },
        idempotencyKey: `area-admin-selected-${id}-${Date.now()}`,
      });
      emailSent = r.sent;
    } catch (e) {
      console.error("area admin email failed", e);
    }
    assertRequestSucceeded(await supabaseAdmin.rpc("log_audit", {
      _actor: context.userId,
      _action: "Area admin added",
      _details: { email: data.email, name: fullName, areas: areaNames || null },
    }), "Admin added, but audit recording failed. Refresh before retrying.");
    return { ok: true as const, id, emailSent };
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
    await assertAdminAccess(context, "Super admin access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: exists, error: existsError } = await supabaseAdmin
      .from("area_admins")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    assertRequestSucceeded({ error: existsError }, "Could not check the area-admin account.");
    if (!exists) return { ok: false as const, error: "That account is not an area admin" };
    assertRequestSucceeded(await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", data.userId), "Could not update the admin profile.");
    assertRequestSucceeded(await supabaseAdmin.from("area_admin_areas").delete().eq("admin_id", data.userId), "Could not remove previous area assignments. Refresh before retrying.");
    if (data.areaIds.length) {
      assertRequestSucceeded(await supabaseAdmin
        .from("area_admin_areas")
        .insert(data.areaIds.map((area_id) => ({ admin_id: data.userId, area_id }))), "Could not save area assignments. Some changes may have completed; refresh before retrying.");
    }
    return { ok: true as const };
  });

export const setAreaAdminStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: uuid, status: z.enum(["Active", "Suspended"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context, "Super admin access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: data.status })
      .eq("id", data.userId);
    assertRequestSucceeded({ error }, "Could not update the area-admin account. Refresh before retrying.");
    return { ok: true as const };
  });

export const deleteAreaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context, "Super admin access required");
    if (data.userId === context.userId) {
      return { ok: false as const, error: "You cannot delete your own account" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: exists, error: existsError } = await supabaseAdmin
      .from("area_admins")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    assertRequestSucceeded({ error: existsError }, "Could not check the area-admin account.");
    if (!exists) return { ok: false as const, error: "That account is not an area admin" };
    // Complaints stay; they simply become unassigned.
    assertRequestSucceeded(await supabaseAdmin
      .from("reports")
      .update({ assigned_admin_id: null })
      .eq("assigned_admin_id", data.userId), "Could not unassign reports. Admin access has not been removed.");
    // Removes admin access only; the person keeps a normal citizen account.
    assertRequestSucceeded(await supabaseAdmin.from("admin_warnings").delete().eq("admin_id", data.userId), "Could not clear admin warnings. Refresh before retrying.");
    assertRequestSucceeded(await supabaseAdmin.from("area_admin_areas").delete().eq("admin_id", data.userId), "Could not remove previous area assignments. Refresh before retrying.");
    const { error } = await supabaseAdmin.from("area_admins").delete().eq("user_id", data.userId);
    assertRequestSucceeded({ error }, "Could not update the area-admin account. Refresh before retrying.");
    assertRequestSucceeded(await supabaseAdmin.rpc("log_audit", {
      _actor: context.userId,
      _action: "Area admin removed",
      _details: { user: data.userId },
    }), "Admin removed, but audit recording failed. Refresh before retrying.");
    return { ok: true as const };
  });
