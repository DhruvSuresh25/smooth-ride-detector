import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ReportsMap } from "@/components/map/ReportsMap";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Crosshair,
  ImageUp,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Ruler,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { SeverityBadge } from "@/components/SeverityBadge";
import { UserShell } from "@/components/layout/Shells";
import { StatCard } from "@/components/reports/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { areaForPoint, useAreas } from "@/lib/staff";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { ANALYSIS_DISCLAIMER, formatDateTime } from "@/lib/constants";
import {
  analyzeRoadImage,
  PROGRESS_STAGES,
  type AnalysisResult,
  type ProgressStage,
} from "@/services/potholeAnalysis";

export const Route = createFileRoute("/_authenticated/analyze")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Analyze Road Image — DriveSafe Vision" },
      {
        name: "description",
        content: "Upload a road photo, capture your location and generate a pothole report.",
      },
      { property: "og:title", content: "Analyze Road Image — DriveSafe Vision" },
      {
        property: "og:description",
        content: "Upload a road photo, capture your location and generate a pothole report.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyzePage,
});

const MAX_BYTES = 8 * 1024 * 1024;

function AnalyzePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [address, setAddress] = useState("");
  const [areaId, setAreaId] = useState("");
  const { data: areas } = useAreas();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "locating" | "denied" | "ready">("idle");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<ProgressStage | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function selectFile(next: File | null) {
    if (!next) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(next.type)) {
      toast.error("Unsupported file type", { description: "Upload a JPG, JPEG or PNG image." });
      return;
    }
    if (next.size > MAX_BYTES) {
      toast.error("Image too large", { description: "Maximum file size is 8 MB." });
      return;
    }
    setResult(null);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function detectArea(point: { lat: number; lng: number }) {
    const match = await areaForPoint(point.lat, point.lng);
    if (match) {
      setAreaId(match);
      const name = areas?.find((a) => a.id === match)?.name;
      toast.success("Area detected", {
        description: `Your location falls in ${name ?? "a configured area"} — it will go straight to that area's admin.`,
      });
    }
  }

  function setPoint(point: { lat: number; lng: number }) {
    setCoords(point);
    void detectArea(point);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      toast.error("Location unavailable", {
        description: "Your browser does not support geolocation. Enter the address manually.",
      });
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setGeoState("ready");
        toast.success("Location captured");
      },
      () => {
        setGeoState("denied");
        toast.error("Location permission denied", {
          description: "Enter the street address manually instead.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function runAnalysis() {
    if (!file) return;
    setResult(null);
    try {
      const analysis = await analyzeRoadImage(file, setStage);
      setResult(analysis);
      toast.success("Analysis complete", {
        description: `${analysis.potholeCount} pothole(s) detected · ${analysis.severity} severity`,
      });
    } catch (error) {
      toast.error("Analysis failed", { description: (error as Error).message });
    } finally {
      setStage(null);
    }
  }

  async function submitReport() {
    if (!file || !result || !user) return;
    if (!address.trim() && !coords) {
      toast.error("Add a location", {
        description: "Enter an address or capture your current location.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const stamp = `${Date.now()}`;
      const ext = file.type === "image/png" ? "png" : "jpg";
      const originalPath = `${user.id}/${stamp}-original.${ext}`;
      const { error: originalError } = await supabase.storage
        .from("report-original-images")
        .upload(originalPath, file, { contentType: file.type });
      if (originalError) throw originalError;

      let annotatedRef: string | null = null;
      if (result.annotatedImageBlob) {
        const annotatedPath = `${user.id}/${stamp}-annotated.jpg`;
        const { error: annotatedError } = await supabase.storage
          .from("report-annotated-images")
          .upload(annotatedPath, result.annotatedImageBlob, { contentType: "image/jpeg" });
        if (annotatedError) throw annotatedError;
        annotatedRef = `report-annotated-images/${annotatedPath}`;
      }

      const { data, error } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          submitter_name: profile?.full_name ?? "",
          submitter_email: profile?.email ?? user.email ?? "",
          original_image_url: `report-original-images/${originalPath}`,
          annotated_image_url: annotatedRef,
          address: address.trim(),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          pothole_count: result.potholeCount,
          severity: result.severity,
          confidence: result.confidence,
          estimated_width: result.estimatedWidth,
          estimated_height: result.estimatedHeight,
          road_position: result.roadPosition,
          description: description.trim() || null,
          status: "Submitted",
          area_id: areaId || null,
        })
        .select("id, report_number")
        .single();
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success(`Report ${data.report_number} submitted`, {
        description: "Road maintenance will review it shortly.",
      });
      navigate({ to: "/reports/$id", params: { id: data.id } });
    } catch (error) {
      toast.error("Could not submit report", { description: (error as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  const analyzing = stage !== null;
  const stageIndex = stage ? PROGRESS_STAGES.indexOf(stage) : -1;

  return (
    <UserShell title="Analyze Road Image" subtitle="Upload a photo and generate a pothole report">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          {/* Upload */}
          <section className="surface-card p-5" aria-label="Image upload">
            <h2 className="font-bold">1. Road image</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              JPG, JPEG or PNG up to 8 MB. Frame the damaged surface clearly.
            </p>

            {preview ? (
              <div className="mt-4 space-y-3">
                <img
                  src={preview}
                  alt="Selected road image preview"
                  className="max-h-80 w-full rounded-xl border border-border object-cover"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                    <RefreshCw className="size-4" aria-hidden="true" /> Replace image
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearFile}>
                    <Trash2 className="size-4" aria-hidden="true" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  selectFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`mt-4 grid place-items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragging ? "border-primary bg-primary-soft" : "border-border bg-muted/40"
                }`}
              >
                <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
                  <ImageUp className="size-6" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium">Drag and drop your road image here</p>
                <p className="text-xs text-muted-foreground">or choose a file from your device</p>
                <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  Choose file
                </Button>
              </div>
            )}

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="sr-only"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              aria-label="Upload road image"
            />
          </section>

          {/* Location */}
          <section className="surface-card p-5" aria-label="Location">
            <h2 className="font-bold">2. Location</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Capture GPS coordinates, or type the address if location access is unavailable.
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                {!!areas?.length && (
                  <div className="mb-3 space-y-2">
                    <Label htmlFor="area">Area (routes your complaint to the area admin)</Label>
                    <select
                      id="area"
                      value={areaId}
                      onChange={(e) => setAreaId(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Not sure / use my location</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <Label htmlFor="address">Street address or landmark</Label>
                <Input
                  id="address"
                  placeholder="e.g. 14 Ring Road, near Central Market"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <Button variant="outline" onClick={useMyLocation} disabled={geoState === "locating"}>
                {geoState === "locating" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Crosshair className="size-4" aria-hidden="true" />
                )}
                Use My Current Location
              </Button>

              <div className="space-y-2">
                <p className="text-sm font-medium">Or tap the map to drop a pin</p>
                <ReportsMap pick={coords} onPick={setPoint} height={260} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input id="lat" readOnly value={coords?.lat ?? ""} placeholder="Not captured" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input id="lng" readOnly value={coords?.lng ?? ""} placeholder="Not captured" />
                </div>
              </div>

              {coords ? (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3">
                  <MapPin className="mt-0.5 size-4 text-primary" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-medium">Approximate device location captured</p>
                    <p className="text-xs text-muted-foreground">
                      {coords.lat}, {coords.lng} — accuracy depends on your device and surroundings.
                    </p>
                  </div>
                </div>
              ) : (
                geoState === "denied" && (
                  <div className="flex items-start gap-3 rounded-lg border border-sev-medium/30 bg-sev-medium-bg p-3 text-sm text-sev-medium">
                    <AlertTriangle className="mt-0.5 size-4" aria-hidden="true" />
                    Location access was not granted, so no coordinates are attached. The address you
                    type will be used instead.
                  </div>
                )
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Notes for the reviewer (optional)</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Anything useful: lane, traffic risk, how long it has been there…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Analysis controls */}
          <section className="surface-card p-5" aria-label="Analysis">
            <h2 className="font-bold">3. Run analysis</h2>
            <p className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {ANALYSIS_DISCLAIMER}
            </p>

            <Button className="mt-4 w-full sm:w-auto" onClick={runAnalysis} disabled={!file || analyzing}>
              {analyzing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Ruler className="size-4" aria-hidden="true" />
              )}
              Analyze Image
            </Button>

            {analyzing && (
              <div className="mt-4 space-y-2">
                <Progress value={((stageIndex + 1) / PROGRESS_STAGES.length) * 100} />
                <p className="text-sm font-medium text-primary">{stage}…</p>
                <ul className="text-xs text-muted-foreground">
                  {PROGRESS_STAGES.map((s, i) => (
                    <li key={s} className={i <= stageIndex ? "text-foreground" : undefined}>
                      {i <= stageIndex ? "✓" : "•"} {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Results */}
        <section className="space-y-5" aria-label="Analysis results">
          {result ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Potholes detected" value={result.potholeCount} tone="primary" />
                <div className="surface-card p-4 sm:p-5">
                  <p className="text-sm font-medium text-muted-foreground">Severity</p>
                  <div className="mt-3">
                    <SeverityBadge severity={result.severity} />
                  </div>
                </div>
                <StatCard label="Confidence" value={`${result.confidence}%`} />
                <StatCard label="Road position" value={result.roadPosition} />
              </div>

              <div className="surface-card p-5">
                <h2 className="font-bold">Image comparison</h2>
                <Tabs defaultValue="annotated" className="mt-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="annotated">Annotated</TabsTrigger>
                    <TabsTrigger value="original">Original</TabsTrigger>
                  </TabsList>
                  <TabsContent value="annotated">
                    {result.annotatedImagePreview ? (
                      <img
                        src={result.annotatedImagePreview}
                        alt={`Road image with ${result.potholeCount} detected pothole(s) outlined`}
                        className="w-full rounded-lg border border-border"
                      />
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground">
                        Annotated image could not be generated in this browser.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="original">
                    {preview && (
                      <img
                        src={preview}
                        alt="Original uploaded road image"
                        className="w-full rounded-lg border border-border"
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <dl className="surface-card grid grid-cols-2 gap-4 p-5 text-sm">
                <div>
                  <dt className="text-muted-foreground">Estimated width</dt>
                  <dd className="font-semibold">{result.estimatedWidth} cm</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Estimated height</dt>
                  <dd className="font-semibold">{result.estimatedHeight} cm</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Latitude</dt>
                  <dd className="font-semibold">{coords?.lat ?? "Not captured"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Longitude</dt>
                  <dd className="font-semibold">{coords?.lng ?? "Not captured"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-semibold">{address || "Not provided"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Analysis timestamp</dt>
                  <dd className="font-semibold">{formatDateTime(result.analyzedAt)}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={submitReport} disabled={submitting} className="gap-2">
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-4" aria-hidden="true" />
                  )}
                  Submit Report
                </Button>
                <Button variant="outline" onClick={clearFile}>
                  Analyze Another Image
                </Button>
                <Button variant="ghost" onClick={() => setResult(null)}>
                  <X className="size-4" aria-hidden="true" /> Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="surface-card grid place-items-center gap-3 p-10 text-center">
              <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Ruler className="size-6" aria-hidden="true" />
              </span>
              <p className="font-semibold">No analysis yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Add a road image and run the analysis — detections, severity and dimensions appear
                here before you submit.
              </p>
            </div>
          )}
        </section>
      </div>
    </UserShell>
  );
}
