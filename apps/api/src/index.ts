import { serve } from "@hono/node-server";
import { app } from "./app.ts";
import { env } from "./config/env.ts";
import { db } from "./db/index.ts";

await db.execute("SELECT 1");
console.log("Database connection successful");

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
