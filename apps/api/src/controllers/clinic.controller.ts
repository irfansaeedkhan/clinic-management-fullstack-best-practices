import { Hono } from "hono";
import { ApiResponse, ApiResponseCode } from "@repo/shared-lib/api-response";
import { requireAuth, type RequireAuthMiddlewareEnv } from "#src/middleware/require-auth.ts";
import { listUserClinics } from "#src/services/clinic.service.ts";
import type { ListUserClinicsData } from "#src/types/api-client/index.ts";

export const clinicController = new Hono<RequireAuthMiddlewareEnv>()
  .basePath("/clinics")
  .use("*", requireAuth)
  .get("/", async (ctx) => {
    const user = ctx.get("user");
    const session = ctx.get("session");

    const data = await listUserClinics({
      userId: Number(user.id),
      activeClinicId: session.activeClinicId,
    });

    return ctx.json(
      new ApiResponse<ListUserClinicsData>({
        responseCode: ApiResponseCode.ok,
        message: "Clinics retrieved successfully",
        data,
      })
    );
  });
