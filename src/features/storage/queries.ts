import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Report images live in private buckets. Paths are stored as
 * "<bucket>/<userId>/<file>" so we can mint a short-lived signed URL on read.
 */
export function useSignedUrl(path?: string | null) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!path) return null;
      const [bucket, ...rest] = path.split("/");
      if (!bucket || !rest.join("/")) throw new Error("Invalid image location.");
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(rest.join("/"), 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

