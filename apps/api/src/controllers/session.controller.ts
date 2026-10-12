import { zValidator } from "#src/lib/zod-validator-wrapper.ts";
import { Hono } from "hono";
import { SwitchClinicSchema } from "@repo/shared-lib/zod-schemas";
import { ApiResponse, ApiResponseCode } from "@repo/shared-lib/api-response";
import { requireAuth, type RequireAuthMiddlewareEnv } from "#src/middleware/require-auth.ts";
import { switchClinic } from "#src/services/session.service.ts";

export const sessionController = new Hono<RequireAuthMiddlewareEnv>()
  .basePath("/session")
  .use("*", requireAuth)
  .patch("/switch-clinic", zValidator("json", SwitchClinicSchema), async (ctx) => {
    const { clinicId } = ctx.req.valid("json");
    const user = ctx.get("user");
    const sessionId = Number(ctx.get("session").id);
    const isSuperUser = ctx.get("isSuperUser");

    await switchClinic({
      user,
      sessionId,
      clinicId,
      isSuperUser,
    });

    return ctx.json(
      new ApiResponse({
        responseCode: ApiResponseCode.ok,
        message: "Clinic switched successfully",
      })
    );
  });
