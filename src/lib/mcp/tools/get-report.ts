import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_report",
  title: "Get pothole report",
  description: "Get full details and status history for one pothole report by its number, e.g. RPT-0001.",
  inputSchema: { reportNumber: z.string().trim().min(1).describe("Report number such as RPT-0001.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ reportNumber }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data: r, error } = await sb
      .from("reports")
      .select("id, report_number, status, severity, pothole_count, confidence, address, latitude, longitude, road_position, description, admin_notes, created_at, resolved_at")
      .eq("report_number", reportNumber.toUpperCase())
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!r) throw new ToolError(`Report ${reportNumber} not found`);
    const { data: hist } = await sb
      .from("report_status_history")
      .select("*")
      .eq("report_id", r.id)
      .order("created_at", { ascending: true });
    const report = {
      reportNumber: r.report_number,
      status: r.status,
      severity: r.severity,
      potholeCount: r.pothole_count,
      confidence: r.confidence,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
      roadPosition: r.road_position,
      description: r.description,
      adminNotes: r.admin_notes,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      history: (hist ?? []).map((h) => ({ status: String(h.status), note: h.note ?? null, at: h.created_at })),
    };
    return { content: [{ type: "text", text: JSON.stringify(report) }], structuredContent: { report } };
  },
});
