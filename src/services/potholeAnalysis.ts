/**
 * Pothole analysis service.
 *
 * This is the ONLY place that talks to a detection model. Today it runs a
 * deterministic simulated detector in the browser and draws bounding boxes onto
 * a canvas to produce the annotated image.
 *
 * To connect a real model (YOLO, Roboflow, Hugging Face, or a custom Python
 * API), replace the body of `analyzeRoadImage` with a request to that endpoint
 * and map its response into the `AnalysisResult` shape below. Nothing else in
 * the app needs to change.
 */
import type { Severity } from "@/lib/constants";
import { analyzePotholePhoto } from "@/lib/pothole-vision.functions";

export type Detection = {
  x: number; // 0..1 relative to image width
  y: number; // 0..1 relative to image height
  width: number; // 0..1
  height: number; // 0..1
  confidence: number; // 0..1
};

export type AnalysisResult = {
  potholeCount: number;
  severity: Severity;
  confidence: number; // percentage 0..100
  estimatedWidth: number; // cm
  estimatedHeight: number; // cm
  roadPosition: "Left" | "Center" | "Right";
  detections: Detection[];
  annotatedImageBlob: Blob | null;
  annotatedImagePreview: string | null;
  simulated: boolean;
  analyzedAt: string;
};

export type ProgressStage =
  | "Uploading image"
  | "Detecting potholes"
  | "Estimating severity"
  | "Generating report";

export const PROGRESS_STAGES: ProgressStage[] = [
  "Uploading image",
  "Detecting potholes",
  "Estimating severity",
  "Generating report",
];

export const isDetectionApiConfigured = true;

const severityStroke: Record<Severity, string> = {
  Low: "#2e9e63",
  Medium: "#d6a419",
  High: "#e07a24",
  Critical: "#d93b31",
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the selected image."));
    };
    img.src = url;
  });
}

async function drawAnnotations(
  img: HTMLImageElement,
  detections: Detection[],
  severity: Severity,
): Promise<{ blob: Blob | null; preview: string | null }> {
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: null, preview: null };

  ctx.drawImage(img, 0, 0, width, height);

  const color = severityStroke[severity];
  ctx.lineWidth = Math.max(2, Math.round(width * 0.005));
  ctx.strokeStyle = color;
  ctx.font = `600 ${Math.max(12, Math.round(width * 0.022))}px "Plus Jakarta Sans", sans-serif`;
  ctx.textBaseline = "top";

  detections.forEach((d, index) => {
    const bx = d.x * width;
    const by = d.y * height;
    const bw = d.width * width;
    const bh = d.height * height;

    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = `${color}22`;
    ctx.fillRect(bx, by, bw, bh);

    const label = `Pothole ${index + 1} · ${(d.confidence * 100).toFixed(0)}%`;
    const metrics = ctx.measureText(label);
    const padding = Math.round(width * 0.008);
    const labelHeight = Math.max(18, Math.round(width * 0.032));
    const labelY = Math.max(0, by - labelHeight);

    ctx.fillStyle = color;
    ctx.fillRect(bx, labelY, metrics.width + padding * 2, labelHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, bx + padding, labelY + padding / 1.5);
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
  );

  return { blob, preview: canvas.toDataURL("image/jpeg", 0.85) };
}

export async function analyzeRoadImage(
  file: File,
  onProgress?: (stage: ProgressStage) => void,
): Promise<AnalysisResult> {
  onProgress?.("Uploading image");
  const img = await loadImage(file);
  const dataUrl = toDataUrl(img, 1280);

  onProgress?.("Detecting potholes");
  const response = await analyzePotholePhoto({ data: { image: dataUrl } });
  if (!response.ok) throw new Error(response.error);
  const r = response.result;
  if (!r.isRoad) throw new Error("This photo doesn't look like a road. Please upload a clear photo of the road surface.");
  if (r.potholeCount === 0 && r.detections.length === 0) {
    throw new Error("No potholes were found in this photo. Try a closer, clearer photo of the damaged area.");
  }

  onProgress?.("Estimating severity");
  const detections = r.detections;

  onProgress?.("Generating report");
  const annotated = await drawAnnotations(img, detections, r.severity);

  return {
    potholeCount: Math.max(r.potholeCount, detections.length),
    severity: r.severity,
    confidence: r.confidence,
    estimatedWidth: r.estimatedWidth,
    estimatedHeight: r.estimatedHeight,
    roadPosition: r.roadPosition,
    detections,
    annotatedImageBlob: annotated.blob,
    annotatedImagePreview: annotated.preview,
    simulated: false,
    analyzedAt: new Date().toISOString(),
  };
}

function toDataUrl(img: HTMLImageElement, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

