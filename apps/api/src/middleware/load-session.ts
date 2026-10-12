import { createMiddleware } from "hono/factory";
import { auth } from "#src/lib/auth.ts";
import type { HonoAppEnv } from "#src/types/index.ts";

export const loadSession = createMiddleware<HonoAppEnv>(async (ctx, next) => {
  ctx.set("activeClinicId", null);
  ctx.set("staffRoles", []);
  ctx.set("isSuperUser", false);

  const session = await auth.api.getSession({ headers: ctx.req.raw.headers });

  if (!session) {
    ctx.set("user", null);
    ctx.set("session", null);
    await next();
    return;
  }

  ctx.set("user", session.user);
  ctx.set("session", session.session);
  ctx.set("isSuperUser", session.user.platformRole === "super_user");
  await next();
});
