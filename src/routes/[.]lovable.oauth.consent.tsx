import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = { data: Record<string, any> | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({ meta: [{ title: "Connect an app — DriveSafe Vision" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.["redirect_url"] ?? data?.["redirect_to"];
    if (immediate && !data?.["client"]) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <p>This connection request could not be loaded: {String(error?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name: string = details?.["client"]?.["name"] ?? details?.["client"]?.["client_name"] ?? "An app";

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    const target = data?.["redirect_url"] ?? data?.["redirect_to"];
    if (error || !target) {
      setBusy(false);
      setError(error?.message ?? "No redirect was returned. Please try again.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
        <Logo to="/" />
        <h1 className="text-xl font-bold">Connect {name} to your account</h1>
        <p className="text-sm text-muted-foreground">
          {name} will be able to read the pothole reports you can see in DriveSafe Vision, acting as you.
        </p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => void decide(true)}>Approve</Button>
          <Button variant="outline" disabled={busy} onClick={() => void decide(false)}>Deny</Button>
        </div>
      </div>
    </main>
  );
}
