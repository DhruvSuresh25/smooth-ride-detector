/** Compatibility exports; feature code lives under features/staff. */
export type { StaffRole, Area, Performance, Band } from "@/features/staff/types";
export { useStaffRole, useAreas, useMyAreas, areaForPoint, usePerformance, useDeadlineDays, useMyWarnings, useThresholds } from "@/features/staff/queries";
export { formatRate, formatRating, performanceBand, bandClasses } from "@/features/staff/performance";
