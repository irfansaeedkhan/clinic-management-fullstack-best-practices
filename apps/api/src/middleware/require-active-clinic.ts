import { createMiddleware } from "hono/factory";
import { loadClinicContext } from "#src/services/clinic.service.ts";
import { forbidden } from "#src/lib/api-error.ts";
import type { RequireAuthMiddlewareEnv } from "./require-auth.ts";

export interface RequireActiveClinicMiddlewareEnv extends RequireAuthMiddlewareEnv {
  Variables: Omit<RequireAuthMiddlewareEnv["Variables"], "activeClinicId"> & {
    activeClinicId: number;
  };
}

export const requireActiveClinic = createMiddleware<RequireActiveClinicMiddlewareEnv>(async (ctx, next) => {
  const user = ctx.get("user");
  const session = ctx.get("session");
  const isSuperUser = ctx.get("isSuperUser");

  const logContext = {
    userId: user.id,
    activeClinicId: session.activeClinicId,
    isSuperUser,
  };

  const clinicContext = await loadClinicContext({
    user,
    activeClinicId: session.activeClinicId,
    isSuperUser,
  });

  if (clinicContext.activeClinicId == null) {
    throw forbidden({ message: "No active clinic found", logContext });
  }

  if (!isSuperUser && clinicContext.staffRoles.length === 0) {
    throw forbidden({ message: "No staff role found", logContext });
  }

  ctx.set("activeClinicId", clinicContext.activeClinicId);
  ctx.set("staffRoles", clinicContext.staffRoles);

  return next();
});
