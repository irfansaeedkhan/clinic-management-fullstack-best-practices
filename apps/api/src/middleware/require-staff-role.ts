import { createMiddleware } from "hono/factory";
import { staffHasRole, type StaffRoleName } from "@repo/shared-lib/staff-roles";
import { forbidden } from "#src/lib/api-error.ts";
import type { RequireActiveClinicMiddlewareEnv } from "#src/middleware/require-active-clinic.ts";

export function requireStaffRole(...allowedRoles: StaffRoleName[]) {
  return createMiddleware<RequireActiveClinicMiddlewareEnv>(async (ctx, next) => {
    if (ctx.get("isSuperUser")) {
      return next();
    }

    const staffRoles = ctx.get("staffRoles");
    const hasAllowedRole = allowedRoles.some((allowedRole) => staffHasRole({ roles: staffRoles, role: allowedRole }));

    if (!hasAllowedRole) {
      throw forbidden({
        message: "Insufficient permissions",
        logContext: { userId: ctx.get("user")?.id, staffRoles },
      });
    }

    return next();
  });
}
