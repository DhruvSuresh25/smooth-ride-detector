import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { assertRequestSucceeded } from "@/lib/api/errors";
import {
  anotherTabIsOpen,
  hasAuthParams,
  hasTabMarker,
  listenForPresencePings,
  setTabMarker,
} from "./tab-session";

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

/**
 * Decide, once per page load, whether a stored session belongs to a tab that is
 * still open. If every tab was closed, the stored session is discarded so the
 * user must sign in again. Reloads and extra tabs keep the user signed in.
 */
async function checkTabSession(): Promise<void> {
  if (hasTabMarker() || hasAuthParams()) {
    setTabMarker();
    return;
  }
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  if (data.session && !(await anotherTabIsOpen())) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  setTabMarker();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let sawAuthEvent = false;
    const stopListening = listenForPresencePings();
    const tabCheck = checkTabSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void tabCheck.then(async () => {
        if (!active) return;
        // The initial event may carry a session discarded by the tab check; re-read it.
        const current =
          event === "INITIAL_SESSION"
            ? (await supabase.auth.getSession().catch(() => ({ data: { session: null } }))).data.session
            : nextSession;
        if (!active) return;
        sawAuthEvent = true;
        if (event === "SIGNED_IN") setTabMarker();
        setSession(current);
        setLoading(false);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          void router.invalidate();
          if (event === "SIGNED_OUT") queryClient.clear();
          else void queryClient.invalidateQueries();
        }
      });
    });

    tabCheck
      .then(() => supabase.auth.getSession())
      .then(({ data, error }) => {
        if (!active || sawAuthEvent) return;
        setSession(error ? null : data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!active || sawAuthEvent) return;
        setSession(null);
        setLoading(false);
      });

    return () => {
      active = false;
      stopListening();
      sub.subscription.unsubscribe();
    };
  }, [queryClient, router]);

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
