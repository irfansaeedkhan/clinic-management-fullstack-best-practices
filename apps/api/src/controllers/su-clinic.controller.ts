import { Hono } from "hono";
import { zValidator } from "#src/lib/zod-validator-wrapper.ts";
import { CreateClinicSchema } from "@repo/shared-lib/zod-schemas";
import { ApiResponse, ApiResponseCode } from "@repo/shared-lib/api-response";
import { requireAuth, type RequireAuthMiddlewareEnv } from "#src/middleware/require-auth.ts";
import { requireSuperUser } from "#src/middleware/require-super-user.ts";
import { createClinic } from "#src/services/clinic.service.ts";

export const suClinicController = new Hono<RequireAuthMiddlewareEnv>()
  .basePath("/su/clinics")
  .use("*", requireAuth, requireSuperUser)
  .post("/", zValidator("json", CreateClinicSchema), async (ctx) => {
    const { name } = ctx.req.valid("json");

    const clinic = await createClinic({ name });

    return ctx.json(
      new ApiResponse({
        responseCode: ApiResponseCode.ok,
        message: "Clinic created successfully",
        data: { clinic },
      }),
      201
    );
  });
