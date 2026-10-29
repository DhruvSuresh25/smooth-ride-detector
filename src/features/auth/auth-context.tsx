import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { assertRequestSucceeded } from "@/lib/api/errors";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  email_notifications: boolean;
  browser_notifications: boolean;
  account_status: string;
  created_at: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
});

/** Signed-in users are signed out after this much inactivity (30 seconds). */
export const IDLE_TIMEOUT_MS = 30_000;
/** Grace period while the window is unfocused (e.g. file picker open). */
export const UNFOCUSED_TIMEOUT_MS = 5 * 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let sawAuthEvent = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      sawAuthEvent = true;
      setSession(nextSession);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void router.invalidate();
        if (event === "SIGNED_OUT") queryClient.clear();
        else void queryClient.invalidateQueries();
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || sawAuthEvent) return;
      setSession(error ? null : data.session);
      setLoading(false);
    }).catch(() => {
      if (!active || sawAuthEvent) return;
      setSession(null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient, router]);

  // Auto sign-out after a period of no user activity.
  // Keyed on user id (not the session object) so token refreshes don't restart it.
  // Listeners use capture so scrolling inside panels/dialogs counts as activity.
  // While the window is unfocused (e.g. the photo/file picker is open) a longer
  // grace period applies so users aren't signed out mid-upload.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let last = Date.now();
    let loggingOut = false;
    const logout = async () => {
      if (loggingOut) return;
      loggingOut = true;
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut().catch(() => undefined);
      void router.navigate({ to: "/login", replace: true });
    };
    const mark = () => {
      last = Date.now();
    };
    const events = [
      "mousemove", "mousedown", "pointerdown", "pointermove", "click", "keydown",
      "input", "change", "scroll", "touchstart", "touchmove", "wheel", "focus", "focusin",
    ] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", mark);
    const interval = setInterval(() => {
      const limit = document.hasFocus() ? IDLE_TIMEOUT_MS : UNFOCUSED_TIMEOUT_MS;
      if (Date.now() - last >= limit) void logout();
    }, 1000);
    return () => {
      clearInterval(interval);
      events.forEach((e) => window.removeEventListener(e, mark, { capture: true }));
      document.removeEventListener("visibilitychange", mark);
    };
  }, [userId, queryClient, router]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      assertRequestSucceeded({ error }, "Could not load your profile. Please try again.");
      return data as Profile | null;
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const result = await supabase.auth.signOut();
    assertRequestSucceeded(result, "Sign-out could not be completed. Please try again.");
    navigate({ to: "/", replace: true });
  };
}
