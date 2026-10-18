import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertRequestSucceeded } from "@/lib/api/errors";

export type AreaAdminRow = {
  user_id: string;
  full_name: string;
  email: string;
  account_status: string;
  areaIds: string[];
};

export function useAreaAdmins() {
  return useQuery({
    queryKey: ["area-admins"],
    queryFn: async (): Promise<AreaAdminRow[]> => {
      const [{ data: admins, error }, { data: links, error: linksError }] = await Promise.all([
        supabase.from("area_admins").select("user_id").order("created_at"),
        supabase.from("area_admin_areas").select("admin_id, area_id"),
      ]);
      assertRequestSucceeded({ error }, "Could not load area admins.");
      assertRequestSucceeded({ error: linksError }, "Could not load admin area assignments.");
      const ids = (admins ?? []).map((a) => a.user_id);
      if (!ids.length) return [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, account_status")
        .in("id", ids);
      assertRequestSucceeded({ error: profilesError }, "Could not load admin profiles.");
      return ids.map((id) => {
        const p = profiles?.find((x) => x.id === id);
        return {
          user_id: id,
          full_name: p?.full_name ?? "",
          email: p?.email ?? "",
          account_status: p?.account_status ?? "Active",
          areaIds: (links ?? []).filter((l) => l.admin_id === id).map((l) => l.area_id),
        };
      });
    },
  });
}

