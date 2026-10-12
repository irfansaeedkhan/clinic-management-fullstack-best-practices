import { createMiddleware } from "hono/factory";
import { forbidden } from "#src/lib/api-error.ts";
import type { RequireAuthMiddlewareEnv } from "#src/middleware/require-auth.ts";

export const requireSuperUser = createMiddleware<RequireAuthMiddlewareEnv>(async (ctx, next) => {
  if (!ctx.get("isSuperUser")) {
    throw forbidden({ message: "Insufficient permissions", logContext: { userId: ctx.get("user")?.id } });
  }

  return next();
});
