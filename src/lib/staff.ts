import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type StaffRole = { isSuper: boolean; isAreaAdmin: boolean };

export function useStaffRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff-role", user?.id],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<StaffRole> => {
      const [{ data: isSuper, error: e1 }, { data: isArea, error: e2 }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
        supabase.rpc("is_area_admin", { _user_id: user!.id }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { isSuper: !!isSuper, isAreaAdmin: !!isArea };
    },
  });
}

export type Area = { id: string; name: string };

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async (): Promise<Area[]> => {
      const { data, error } = await supabase.from("areas").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Areas assigned to the signed-in area admin (empty for everyone else). */
export function useMyAreas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-areas", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Area[]> => {
      const { data: links, error } = await supabase
        .from("area_admin_areas")
        .select("area_id")
        .eq("admin_id", user!.id);
      if (error) throw error;
      const ids = (links ?? []).map((l) => l.area_id);
      if (!ids.length) return [];
      const { data, error: e2 } = await supabase.from("areas").select("id, name").in("id", ids);
      if (e2) throw e2;
      return data ?? [];
    },
  });
}

/** Look up which area contains a GPS point (null when none matches). */
export async function areaForPoint(lat: number, lng: number): Promise<string | null> {
  const { data, error } = await supabase.rpc("area_for_point_within", { _lat: lat, _lng: lng });
  if (error) return null;
  return (data as string | null) ?? null;
}

export type Performance = {
  total: number;
  fixed: number;
  fixed_on_time: number;
  overdue: number;
  on_time_rate: number | null;
  avg_rating: number | null;
  rating_count: number;
};

export function usePerformance(adminId: string | null | undefined) {
  return useQuery({
    queryKey: ["performance", adminId],
    enabled: !!adminId,
    queryFn: async (): Promise<Performance | null> => {
      const { data, error } = await supabase.rpc("admin_performance", { _admin_id: adminId! });
      if (error) throw error;
      return (data?.[0] as Performance | undefined) ?? null;
    },
  });
}

export function useDeadlineDays() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("default_deadline_days")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data?.default_deadline_days ?? 7;
    },
  });
}

export function useMyWarnings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["warnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_warnings")
        .select("id, message, created_at")
        .eq("admin_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function formatRate(p: Performance | null | undefined) {
  return p?.on_time_rate != null ? `${p.on_time_rate}%` : "—";
}
export function formatRating(p: Performance | null | undefined) {
  return p?.avg_rating != null ? `${p.avg_rating} / 5 (${p.rating_count})` : "No ratings yet";
}

export function useThresholds() {
  return useQuery({
    queryKey: ["app-settings", "thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("good_threshold, poor_threshold")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return { good: data?.good_threshold ?? 85, poor: data?.poor_threshold ?? 60 };
    },
  });
}

export type Band = "Good" | "Average" | "Poor" | null;
export function performanceBand(
  p: Performance | null | undefined,
  t: { good: number; poor: number } | undefined,
): Band {
  if (p?.on_time_rate == null || !t) return null;
  if (p.on_time_rate >= t.good) return "Good";
  if (p.on_time_rate < t.poor) return "Poor";
  return "Average";
}
export const bandClasses: Record<"Good" | "Average" | "Poor", string> = {
  Good: "bg-sev-low-bg text-sev-low border-sev-low/25",
  Average: "bg-sev-medium-bg text-sev-medium border-sev-medium/25",
  Poor: "bg-sev-critical-bg text-sev-critical border-sev-critical/25",
};
