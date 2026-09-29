import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import { createLovableAiGatewayRunIdFetch } from "./ai/run-id.server.ts";

const MODEL = "openai/gpt-6-astra";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

export type VisionDetection = { x: number; y: number; width: number; height: number; confidence: number };
export type VisionResult = {
  isRoad: boolean;
  potholeCount: number;
  severity: (typeof SEVERITIES)[number];
  confidence: number;
  estimatedWidth: number;
  estimatedHeight: number;
  roadPosition: "Left" | "Center" | "Right";
  detections: VisionDetection[];
  summary: string;
};

const SYSTEM = `You are a road-damage inspector for DriveSafe Vision. Inspect the ENTIRE road photo and grade pothole damage.

Scan the whole image systematically: the top/far-distance area, the middle, and the bottom/foreground, plus the left edge, centre and right edge. Potholes further away look smaller and appear higher in the frame — include them too. Do not focus only on the foreground.

Severity rubric (use the WORST damage visible anywhere in the image):
- Low: hairline cracks or a small shallow pothole under ~20 cm, no exposed base layer.
- Medium: one or two potholes 20–50 cm wide, shallow (under ~5 cm deep), edges mostly intact.
- High: potholes over ~50 cm, clearly deep (5–10 cm), exposed gravel/base, several potholes, or water-filled holes.
- Critical: large or deep (over ~10 cm) potholes, broken/crumbled road surface across much of a lane, clusters of potholes, road collapse, or damage that forces vehicles to swerve or could damage wheels. When most of the visible road surface is destroyed, ALWAYS choose Critical.
Do not under-grade. If unsure between two levels, pick the higher one.

Reply with ONLY a JSON object, no markdown:
{"isRoad":boolean,"potholeCount":integer,"severity":"Low"|"Medium"|"High"|"Critical","confidence":number 0-100,"estimatedWidthCm":number,"estimatedDepthCm":number,"roadPosition":"Left"|"Center"|"Right","detections":[{"x":0-1,"y":0-1,"width":0-1,"height":0-1,"confidence":0-1}],"summary":"one short sentence"}
Detections are tight bounding boxes of EVERY pothole found anywhere in the image (near and far), relative to image width/height, top-left origin, at most 15. potholeCount must count all potholes in the whole image. If no road or no pothole is visible, return potholeCount 0 and an empty detections array.`;

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
};

function parse(text: string): VisionResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The analysis returned an unreadable result. Please try again.");
  const raw = JSON.parse(match[0]) as Record<string, unknown>;
  const severity = SEVERITIES.includes(raw["severity"] as never)
    ? (raw["severity"] as VisionResult["severity"])
    : "Medium";
  const pos = raw["roadPosition"];
  const detections = (Array.isArray(raw["detections"]) ? raw["detections"] : [])
    .slice(0, 15)
    .map((d: Record<string, unknown>) => {
      const x = clamp(d["x"], 0, 0.98, 0.3);
      const y = clamp(d["y"], 0, 0.98, 0.5);
      return {
        x,
        y,
        width: clamp(d["width"], 0.02, 1 - x, 0.2),
        height: clamp(d["height"], 0.02, 1 - y, 0.15),
        confidence: clamp(d["confidence"], 0, 1, 0.8),
      };
    });
  return {
    isRoad: raw["isRoad"] !== false,
    potholeCount: Math.round(clamp(raw["potholeCount"], 0, 50, detections.length)),
    severity,
    confidence: Math.round(clamp(raw["confidence"], 0, 100, 75) * 10) / 10,
    estimatedWidth: Math.round(clamp(raw["estimatedWidthCm"], 0, 2000, 0)),
    estimatedHeight: Math.round(clamp(raw["estimatedDepthCm"], 0, 200, 0)),
    roadPosition: pos === "Left" || pos === "Right" ? pos : "Center",
    detections,
    summary: typeof raw["summary"] === "string" ? raw["summary"].slice(0, 300) : "",
  };
}

export async function analyzePotholeImage(imageDataUrl: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false as const, error: "Image analysis is not configured for this app." };

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyse this whole road photo for potholes — top, middle and bottom, left to right." },
            {
              type: "file",
              mediaType: "image/jpeg",
              data: new URL(imageDataUrl),
              providerOptions: { openai: { imageDetail: "high" } },
            },
          ],
        },
      ],
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = (await result.text).trim();
    return { ok: true as const, result: parse(text) };
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Image analysis is temporarily unavailable. Please try again shortly.";
    return { ok: false as const, error: message };
  }
}
