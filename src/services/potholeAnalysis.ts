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

export const isDetectionApiConfigured = false;

/** Stable pseudo-random generator so the same file yields the same reading. */
function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function seedFromFile(file: File) {
  const key = `${file.name}:${file.size}:${file.lastModified}`;
  let hash = 7;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
  return hash;
}

function severityFor(area: number, count: number): Severity {
  const score = area * 100 + count * 4;
  if (score > 26) return "Critical";
  if (score > 17) return "High";
  if (score > 9) return "Medium";
  return "Low";
}

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
  const rand = seededRandom(seedFromFile(file));

  onProgress?.("Uploading image");
  const img = await loadImage(file);
  await wait(500);

  onProgress?.("Detecting potholes");
  const potholeCount = 1 + Math.floor(rand() * 3);
  const detections: Detection[] = Array.from({ length: potholeCount }, () => {
    const w = 0.14 + rand() * 0.24;
    const h = 0.1 + rand() * 0.2;
    return {
      x: Math.min(0.96 - w, 0.04 + rand() * 0.6),
      y: Math.min(0.94 - h, 0.3 + rand() * 0.45),
      width: w,
      height: h,
      confidence: 0.74 + rand() * 0.24,
    };
  });
  await wait(700);

  onProgress?.("Estimating severity");
  const largest = detections.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b));
  const severity = severityFor(largest.width * largest.height, potholeCount);
  const centerX = largest.x + largest.width / 2;
  const roadPosition = centerX < 0.36 ? "Left" : centerX > 0.64 ? "Right" : "Center";
  await wait(500);

  onProgress?.("Generating report");
  const annotated = await drawAnnotations(img, detections, severity);

  const confidence =
    (detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length) * 100;

  return {
    potholeCount,
    severity,
    confidence: Math.round(confidence * 10) / 10,
    estimatedWidth: Math.round(largest.width * 320),
    estimatedHeight: Math.round(largest.height * 210),
    roadPosition,
    detections,
    annotatedImageBlob: annotated.blob,
    annotatedImagePreview: annotated.preview,
    simulated: !isDetectionApiConfigured,
    analyzedAt: new Date().toISOString(),
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
