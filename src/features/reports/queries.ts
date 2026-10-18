import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { assertRequestSucceeded } from "@/lib/api/errors";
import type { Report, StatusEvent } from "./types";

export function useMyReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reports", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      assertRequestSucceeded({ error }, "Could not load reports. Please try again.");
      return (data ?? []) as Report[];
    },
  });
}

export function useAllReports() {
  return useQuery({
    queryKey: ["reports", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      assertRequestSucceeded({ error }, "Could not load reports. Please try again.");
      return (data ?? []) as Report[];
    },
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
      assertRequestSucceeded({ error }, "Could not load reports. Please try again.");
      return (data as Report) ?? null;
    },
  });
}

export function useReportHistory(id: string) {
  return useQuery({
    queryKey: ["report-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_status_history")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: true });
      assertRequestSucceeded({ error }, "Could not load reports. Please try again.");
      return (data ?? []) as StatusEvent[];
    },
  });
}

