/** Compatibility exports; new code imports from features/reports or features/users. */
export type { Report, StatusEvent } from "@/features/reports/types";
export { useMyReports, useAllReports, useReport, useReportHistory } from "@/features/reports/queries";
export { countByStatus, averageResolutionDays } from "@/features/reports/statistics";
export { useAllUsers } from "@/features/users/queries";
