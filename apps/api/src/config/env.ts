import { z } from "zod";
import { levels, type Level } from "pino";
import { AppEnvSchema } from "@repo/shared-lib/zod-schemas";

const envSchema = z.object({
  APP_NAME: z.string().min(1, "APP_NAME must be at least 1 character").default("CMS API"),
  APP_ENV: AppEnvSchema,
  PORT: z.coerce.number(),
  LOG_LEVEL: z.enum(Object.keys(levels.values) as Level[]).default("info"),
  API_URL: z.url("API_URL must be a valid URL"),
  DASHBOARD_URL: z.url("DASHBOARD_URL must be a valid URL"),
  DATABASE_URL: z.url("DATABASE_URL must be a valid URL"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  SUPER_USER_EMAILS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
});

export const env = envSchema.parse(process.env);
