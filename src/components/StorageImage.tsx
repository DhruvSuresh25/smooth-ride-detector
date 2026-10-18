import { ImageOff } from "lucide-react";

import { useSignedUrl } from "@/features/storage/queries";
export { useSignedUrl } from "@/features/storage/queries";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
