import { describe, expect, it } from "vitest";
import { filterAndSortReports } from "./list";
import { averageResolutionDays, countByStatus } from "./statistics";
import type { Report } from "./types";

const makeReport = (overrides: Partial<Report> = {}): Report => ({
  id: "one", report_number: "RPT-0001", user_id: "citizen", submitter_name: "Citizen",
  submitter_email: "citizen@example.test", address: "Main Road", severity: "High",
  status: "Submitted", created_at: "2026-10-18T10:00:00Z", updated_at: "2026-10-18T10:00:00Z",
  original_image_url: null, annotated_image_url: null, latitude: null, longitude: null,
  pothole_count: 1, confidence: null, estimated_width: null, estimated_height: null,
  road_position: null, description: null, admin_notes: null, resolved_at: null, area_id: null,
  assigned_admin_id: null, deadline_at: null, citizen_rating: null, rated_at: null,
  citizen_comment: null, confirmed_fixed: null, repair_image_url: null, ...overrides,
});
const filters = { search: "", status: "all", severity: "all", sort: "newest" };

describe("shared report rules", () => {
  it("preserves citizen search without exposing admin-only search fields", () => {
    const reports = [makeReport()];
    expect(filterAndSortReports(reports, { ...filters, search: "CITIZEN" })).toHaveLength(0);
    expect(filterAndSortReports(reports, { ...filters, search: "CITIZEN", includeSubmitter: true })).toHaveLength(1);
  });
  it("filters assigned and unassigned areas", () => {
    const reports = [makeReport(), makeReport({ id: "two", area_id: "area-a" })];
    expect(filterAndSortReports(reports, { ...filters, area: "unassigned" }).map(r => r.id)).toEqual(["one"]);
    expect(filterAndSortReports(reports, { ...filters, area: "area-a" }).map(r => r.id)).toEqual(["two"]);
  });
  it("keeps the entire first day in a seven-day local-date window", () => {
    const now = new Date(2026, 9, 18, 15);
    const reports = [makeReport({ created_at: new Date(2026, 9, 12, 0).toISOString() }), makeReport({ id: "old", created_at: new Date(2026, 9, 11, 23, 59).toISOString() })];
    expect(filterAndSortReports(reports, { ...filters, dateFilter: "7" }, now).map(r => r.id)).toEqual(["one"]);
  });
  it("sorts highest severity first without mutating the input", () => {
    const reports = [makeReport({ severity: "Low" }), makeReport({ id: "two", severity: "Critical" })];
    expect(filterAndSortReports(reports, { ...filters, sort: "severity" }).map(r => r.id)).toEqual(["two", "one"]);
    expect(reports[0]?.id).toBe("one");
  });
  it("preserves status counts and resolution rounding", () => {
    const reports = [makeReport(), makeReport({ status: "Fixed", resolved_at: "2026-10-20T22:00:00Z" })];
    expect(countByStatus(reports, "Fixed")).toBe(1);
    expect(averageResolutionDays(reports)).toBe(2.5);
    expect(averageResolutionDays([])).toBeNull();
  });
});
