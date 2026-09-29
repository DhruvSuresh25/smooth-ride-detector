import { auth, defineMcp } from "@lovable.dev/mcp-js";

import getReport from "./tools/get-report";
import listReports from "./tools/list-reports";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "drivesafe-vision",
  title: "DriveSafe Vision",
  version: "0.1.0",
  instructions:
    "Pothole reports from DriveSafe Vision. Use `list_reports` to browse reports (filter by status or severity) and `get_report` for full details and status history of one report.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listReports, getReport],
});
