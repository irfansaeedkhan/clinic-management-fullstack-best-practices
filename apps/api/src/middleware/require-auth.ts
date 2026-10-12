import { createMiddleware } from "hono/factory";
import { auth } from "#src/lib/auth.ts";
import { forbidden, unauthorized } from "#src/lib/api-error.ts";
import type { AppVariables, HonoAppEnv } from "#src/types/index.ts";

export interface RequireAuthMiddlewareEnv extends HonoAppEnv {
  Variables: Omit<HonoAppEnv["Variables"], "user" | "session"> & {
    user: NonNullable<AppVariables["user"]>;
    session: NonNullable<AppVariables["session"]>;
  };
}

export const requireAuth = createMiddleware<RequireAuthMiddlewareEnv>(async (ctx, next) => {
  const user = ctx.get("user");
  const session = ctx.get("session");

  if (!user || !session) {
    throw unauthorized({ logContext: { userId: user?.id, sessionId: session?.id } });
  }

  if (user.status !== "active") {
    await auth.api.revokeSession({
      headers: ctx.req.raw.headers,
      body: {
        token: session.token,
      },
    });

    throw forbidden({ message: "Account is not active", logContext: { userId: user.id, status: user.status } });
  }

  return next();
});
