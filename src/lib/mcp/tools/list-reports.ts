import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_reports",
  title: "List pothole reports",
  description:
    "List pothole reports visible to the signed-in user (their own, or all reports for admins), newest first.",
  inputSchema: {
    status: z
      .enum(["Submitted", "Received", "In Progress", "Fixed", "Rejected", "Duplicate"])
      .optional()
      .describe("Only return reports with this status."),
    severity: z.enum(["Low", "Medium", "High", "Critical"]).optional().describe("Only this severity."),
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum reports to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, severity, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("reports")
      .select("report_number, status, severity, pothole_count, confidence, address, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    if (severity) q = q.eq("severity", severity);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const reports = (data ?? []).map((r) => ({
      reportNumber: r.report_number,
      status: r.status,
      severity: r.severity,
      potholeCount: r.pothole_count,
      confidence: r.confidence,
      address: r.address,
      createdAt: r.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(reports) }], structuredContent: { reports } };
  },
});
