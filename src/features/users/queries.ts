import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertRequestSucceeded } from "@/lib/api/errors";

export function useAllUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const results =
        await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("reports").select("user_id"),
          supabase.from("user_roles").select("user_id, role"),
          supabase.from("area_admins").select("user_id"),
        ]);
      for (const result of results) {
        assertRequestSucceeded(result, "Could not load user details. Please try again.");
      }
      const [{ data: profiles }, { data: reports }, { data: roles }, { data: areaAdmins }] = results;

      const counts = new Map<string, number>();
      (reports ?? []).forEach((r) => {
        counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
      });
      const areaSet = new Set((areaAdmins ?? []).map((a) => a.user_id));
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r) => {
        if (r.role === "admin" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        report_count: counts.get(p.id) ?? 0,
        role: roleMap.get(p.id) === "admin" ? "admin" : areaSet.has(p.id) ? "area_admin" : "user",
      }));
    },
  });
}

