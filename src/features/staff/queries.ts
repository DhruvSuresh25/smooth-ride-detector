import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { assertRequestSucceeded } from "@/lib/api/errors";
import type { StaffRole, Area, Performance } from "./types";

export function useStaffRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff-role", user?.id],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<StaffRole> => {
      if (!user) return { isSuper: false, isAreaAdmin: false };
      const [{ data: isSuper, error: e1 }, { data: isArea, error: e2 }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        supabase.rpc("is_area_admin", { _user_id: user.id }),
      ]);
      assertRequestSucceeded({ error: e1 }, "Could not load account permissions.");
      assertRequestSucceeded({ error: e2 }, "Could not load assigned areas.");
      return { isSuper: !!isSuper, isAreaAdmin: !!isArea };
    },
  });
}


export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async (): Promise<Area[]> => {
      const { data, error } = await supabase.from("areas").select("id, name").order("name");
      assertRequestSucceeded({ error }, "Could not load area details. Please try again.");
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
      if (!user) return [];
      const { data: links, error } = await supabase
        .from("area_admin_areas")
        .select("area_id")
        .eq("admin_id", user.id);
      assertRequestSucceeded({ error }, "Could not load area details. Please try again.");
      const ids = (links ?? []).map((l) => l.area_id);
      if (!ids.length) return [];
      const { data, error: e2 } = await supabase.from("areas").select("id, name").in("id", ids);
      assertRequestSucceeded({ error: e2 }, "Could not load assigned areas.");
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


export function usePerformance(adminId: string | null | undefined) {
  return useQuery({
    queryKey: ["performance", adminId],
    enabled: !!adminId,
    queryFn: async (): Promise<Performance | null> => {
      if (!adminId) return null;
      const { data, error } = await supabase.rpc("admin_performance", { _admin_id: adminId });
      assertRequestSucceeded({ error }, "Could not load area details. Please try again.");
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
      assertRequestSucceeded({ error }, "Could not load area details. Please try again.");
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
      if (!user) return [];
      const { data, error } = await supabase
        .from("admin_warnings")
        .select("id, message, created_at")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false });
      assertRequestSucceeded({ error }, "Could not load area details. Please try again.");
      return data ?? [];
    },
  });
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
      assertRequestSucceeded({ error }, "Could not load area details. Please try again.");
      return { good: data?.good_threshold ?? 85, poor: data?.poor_threshold ?? 60 };
    },
  });
}

