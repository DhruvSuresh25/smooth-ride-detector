import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireBackendConfig } from "@/config/environment";

/** Request-local public read client; never shares a user session or uses admin credentials. */
export function createPublicClient(url: string | undefined, key: string | undefined) {
  const config = requireBackendConfig(url, key);
  return createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (config.key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${config.key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", config.key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}