import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const analyzePotholePhoto = createServerFn({ method: "POST" })
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
