import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ReportStatus, Severity } from "@/lib/constants";

export type Report = {
  id: string;
  report_number: string;
  user_id: string;
  submitter_name: string;
  submitter_email: string;
  original_image_url: string | null;
  annotated_image_url: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  pothole_count: number;
  severity: Severity;
  confidence: number | null;
  estimated_width: number | null;
  estimated_height: number | null;
  road_position: string | null;
  description: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  area_id: string | null;
  assigned_admin_id: string | null;
  deadline_at: string | null;
  citizen_rating: number | null;
  rated_at: string | null;
};

export type StatusEvent = {
  id: string;
  report_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

export function useMyReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reports", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
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
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
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
      if (error) throw error;
      return (data ?? []) as StatusEvent[];
    },
  });
}

export function useAllUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: reports }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("reports").select("user_id"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;

      const counts = new Map<string, number>();
      (reports ?? []).forEach((r) => {
        counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
      });
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r) => {
        if (r.role === "admin" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        report_count: counts.get(p.id) ?? 0,
        role: roleMap.get(p.id) ?? "user",
      }));
    },
  });
}

export function countByStatus(reports: Report[], status: ReportStatus) {
  return reports.filter((r) => r.status === status).length;
}

export function averageResolutionDays(reports: Report[]) {
  const resolved = reports.filter((r) => r.resolved_at);
  if (!resolved.length) return null;
  const totalMs = resolved.reduce(
    (sum, r) => sum + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()),
    0,
  );
  return Math.round((totalMs / resolved.length / 86400000) * 10) / 10;
}
