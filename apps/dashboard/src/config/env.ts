import { z } from "zod";
import { AppEnvSchema } from "@repo/shared-lib/zod-schemas";

const envSchema = z.object({
  VITE_APP_ENV: AppEnvSchema,
  VITE_API_URL: z.url("VITE_API_URL must be a valid URL"),
});

export const env = envSchema.parse(import.meta.env);
