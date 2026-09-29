import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analyzePotholePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        image: z
          .string()
          .max(4_000_000)
          .regex(/^data:image\/(jpeg|png);base64,/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { analyzePotholeImage } = await import("./pothole-vision.server.ts");
    return analyzePotholeImage(data.image);
  });
