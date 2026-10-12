import { defineConfig } from "drizzle-kit";
import { env } from "#src/config/env.ts";
import { dbConfig } from "./db.config.ts";

/**
 * For Drizzle Kit.
 */
export default defineConfig({
  ...dbConfig,
  out: "./src/db/migrations",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
