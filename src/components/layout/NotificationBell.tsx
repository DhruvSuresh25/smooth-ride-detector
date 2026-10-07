import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/constants";
import { useStaffRole } from "@/lib/staff";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: role } = useStaffRole();
  const isStaff = !!role?.isSuper || !!role?.isAreaAdmin;

  // Staff sessions flag newly overdue complaints and send their notices.
  useEffect(() => {
    if (!isStaff) return;
    void supabase.rpc("sync_overdue").then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
  }, [isStaff, qc]);

  const { data: items } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
  const unread = (items ?? []).filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAllRead() {
    if (!unread) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications (${unread} unread)`} className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" /> Mark all as read
            </button>
          )}
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {(items ?? []).length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</li>
          )}
          {(items ?? []).map((n) => {
            const inner = (
              <>
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </>
            );
            return (
              <li key={n.id} className={cn("border-b border-border last:border-0", !n.read_at && "bg-primary-soft/50")}>
                {n.link ? (
                  <Link
                    to={n.link}
                    onClick={() => void markRead(n.id)}
                    className="block px-4 py-3 hover:bg-muted"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className="block w-full px-4 py-3 text-left hover:bg-muted"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
