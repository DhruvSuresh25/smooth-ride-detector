import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
      const [bucket, ...rest] = path!.split("/");
      const { data, error } = await supabase.storage
        .from(bucket!)
        .createSignedUrl(rest.join("/"), 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function StorageImage({
  path,
  alt,
  className,
  emptyLabel = "No image available",
}: {
  path?: string | null;
  alt: string;
  className?: string;
  emptyLabel?: string | undefined;
}) {
  const { data, isLoading, isError } = useSignedUrl(path);

  if (!path || isError) {
    return (
      <div
        className={cn(
          "grid place-items-center gap-2 rounded-lg bg-muted p-6 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-5" aria-hidden="true" />
        {emptyLabel}
      </div>
    );
  }

  if (isLoading || !data) return <Skeleton className={cn("rounded-lg", className)} />;

  return <img src={data} alt={alt} className={cn("rounded-lg object-cover", className)} />;
}
