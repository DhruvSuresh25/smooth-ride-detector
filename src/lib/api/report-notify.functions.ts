import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin-only: emails the report's submitter about a status/notes update.
export const notifyReportUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: report, error } = await context.supabase
      .from("reports")
      .select("id, report_number, user_id, submitter_name, submitter_email, status, admin_notes, address, updated_at")
      .eq("id", data.reportId)
      .single();
    if (error || !report) throw new Error("Report not found");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, full_name, email_notifications")
      .eq("id", report.user_id)
      .maybeSingle();
    if (profile && profile.email_notifications === false) return { sent: false, reason: "opted_out" };

    const to = report.submitter_email || profile?.email;
    if (!to) return { sent: false, reason: "no_email" };

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail("report-status-update", to, {
      templateData: {
        name: report.submitter_name || profile?.full_name || undefined,
        reportNumber: report.report_number,
        status: report.status,
        note: report.admin_notes ?? undefined,
        address: report.address || undefined,
        reportUrl: `https://drivesafevision.com/reports/${report.id}`,
      },
      idempotencyKey: `report-status-update-${report.id}-${report.updated_at}`,
    });
    return result.sent ? { sent: true } : { sent: false, reason: result.reason };
  });
