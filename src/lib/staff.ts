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
