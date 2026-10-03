import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gauge, Timer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SEVERITIES } from "@/lib/constants";
import { useAreas, useThresholds } from "@/lib/staff";

export function ThresholdSetting() {
  const qc = useQueryClient();
  const { data } = useThresholds();
  const [good, setGood] = useState("85");
  const [poor, setPoor] = useState("60");
  useEffect(() => {
    if (data) {
      setGood(String(data.good));
      setPoor(String(data.poor));
    }
  }, [data]);

  async function save() {
    const g = Number(good);
    const p = Number(poor);
    if (![g, p].every((n) => Number.isInteger(n) && n >= 0 && n <= 100) || p >= g) {
      toast.error("Use whole numbers 0–100, with Poor below Good");
      return;
    }
    const { error } = await supabase.from("app_settings").update({ good_threshold: g, poor_threshold: p }).eq("id", 1);
    if (error) return void toast.error("Could not save", { description: error.message });
    toast.success("Performance thresholds saved");
    void qc.invalidateQueries({ queryKey: ["app-settings"] });
  }

  return (
    <section className="surface-card p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <Gauge className="size-4 text-primary" aria-hidden="true" /> Performance thresholds
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        On-time rate at or above Good shows "Good"; below Poor shows "Poor" and alerts you.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span>Good ≥</span>
        <Input type="number" min={0} max={100} value={good} onChange={(e) => setGood(e.target.value)} className="w-20" aria-label="Good threshold" />
        <span>% · Poor &lt;</span>
        <Input type="number" min={0} max={100} value={poor} onChange={(e) => setPoor(e.target.value)} className="w-20" aria-label="Poor threshold" />
        <span>%</span>
        <Button size="sm" onClick={save}>Save</Button>
      </div>
    </section>
  );
}

export function DeadlineRules() {
  const qc = useQueryClient();
  const { data: areas } = useAreas();
  const { data: rules } = useQuery({
    queryKey: ["deadline-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deadline_rules").select("id, area_id, severity, days").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [area, setArea] = useState("any");
  const [severity, setSeverity] = useState("any");
  const [days, setDays] = useState("3");

  async function add() {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 365) return void toast.error("Days must be 1–365");
    if (area === "any" && severity === "any") return void toast.error("Pick an area, a severity, or both");
    const { error } = await supabase.from("deadline_rules").upsert(
      { area_id: area === "any" ? null : area, severity: severity === "any" ? null : severity, days: n },
      { onConflict: "area_id,severity" },
    );
    if (error) return void toast.error("Could not save rule", { description: error.message });
    toast.success("Deadline rule saved — applies to new complaints");
    void qc.invalidateQueries({ queryKey: ["deadline-rules"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("deadline_rules").delete().eq("id", id);
    if (error) return void toast.error("Could not remove", { description: error.message });
    void qc.invalidateQueries({ queryKey: ["deadline-rules"] });
  }

  const areaName = (id: string | null) => (id ? areas?.find((a) => a.id === id)?.name ?? "Area" : "Any area");

  return (
    <section className="surface-card p-5 lg:col-span-2">
      <h2 className="flex items-center gap-2 font-bold">
        <Timer className="size-4 text-primary" aria-hidden="true" /> Deadlines by area or severity
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The most specific rule wins: area + severity, then area, then severity, then the default.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-44" aria-label="Area"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any area</SelectItem>
            {(areas ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-36" aria-label="Severity"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any severity</SelectItem>
            {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className="w-20" aria-label="Days" />
        <span className="text-sm text-muted-foreground">days</span>
        <Button size="sm" onClick={add}>Add rule</Button>
      </div>
      <ul className="mt-4 divide-y divide-border text-sm">
        {(rules ?? []).length === 0 && <li className="py-2 text-muted-foreground">No rules — every complaint uses the default.</li>}
        {(rules ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2">
            <span>
              {areaName(r.area_id)} · {r.severity ?? "Any severity"} → <strong>{r.days} days</strong>
            </span>
            <Button size="icon" variant="ghost" aria-label="Remove rule" onClick={() => void remove(r.id)}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
