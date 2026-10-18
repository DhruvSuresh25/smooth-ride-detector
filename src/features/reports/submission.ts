import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/services/pothole-analysis";
import { assertRequestSucceeded } from "@/lib/api/errors";

export type ReportSubmission = {
  file: File;
  result: AnalysisResult;
  userId: string;
  name: string;
  email: string;
  address: string;
  coords: { lat: number; lng: number } | null;
  description: string;
  areaId: string;
};

/** Owns storage + persistence; callers own progress, notifications, and navigation. */
export async function submitAnalyzedReport(input: ReportSubmission) {
  const { file, result, userId, coords } = input;
  const stamp = `${Date.now()}`;
  const extension = file.type === "image/png" ? "png" : "jpg";
  const originalPath = `${userId}/${stamp}-original.${extension}`;
  assertRequestSucceeded(
    await supabase.storage.from("report-original-images").upload(originalPath, file, { contentType: file.type }),
    "Could not upload the original photo. Please try again.",
  );
  let annotatedRef: string | null = null;
  if (result.annotatedImageBlob) {
    const path = `${userId}/${stamp}-annotated.jpg`;
    assertRequestSucceeded(
      await supabase.storage.from("report-annotated-images").upload(path, result.annotatedImageBlob, { contentType: "image/jpeg" }),
      "Could not upload the annotated photo. Please try again.",
    );
    annotatedRef = `report-annotated-images/${path}`;
  }
  const response = await supabase.from("reports").insert({
    user_id: userId,
    submitter_name: input.name,
    submitter_email: input.email,
    original_image_url: `report-original-images/${originalPath}`,
    annotated_image_url: annotatedRef,
    address: input.address.trim(),
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    pothole_count: result.potholeCount,
    severity: result.severity,
    confidence: result.confidence,
    estimated_width: result.estimatedWidth,
    estimated_height: result.estimatedHeight,
    road_position: result.roadPosition,
    description: input.description.trim() || null,
    status: "Submitted",
    area_id: input.areaId || null,
  }).select("id, report_number").single();
  assertRequestSucceeded(response, "Could not save your report. Please try again.");
  if (!response.data) throw new Error("No saved report was returned. Please try again.");
  return response.data;
}