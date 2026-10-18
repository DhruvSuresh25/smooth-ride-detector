import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** One request cache per router, never a shared server-side global or duplicate UI store. */
export function createAppQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: () => {
        if (typeof window !== "undefined") toast.error("Could not load data", { description: "Please try again. Your saved data has not been removed." });
      },
    }),
    mutationCache: new MutationCache({
      onError: (_error, _variables, _context, mutation) => {
        // Mutations with their own feedback must not show duplicate notifications.
        if (!mutation.options.onError && typeof window !== "undefined") {
          toast.error("Could not save changes", { description: "Please try again." });
        }
      },
    }),
  });
}