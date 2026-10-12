import { Hono } from "hono";
import { zValidator } from "#src/lib/zod-validator-wrapper.ts";
import { requireAuth, type RequireAuthMiddlewareEnv } from "#src/middleware/require-auth.ts";
import { requireSuperUser } from "#src/middleware/require-super-user.ts";
import { createStaff, updateStaffRoles, updateStaffStatus } from "#src/services/staff.service.ts";
import { ApiResponse, ApiResponseCode } from "@repo/shared-lib/api-response";
import {
  CreateStaffSchema,
  StaffIdParamSchema,
  UpdateStaffRolesSchema,
  UpdateStaffStatusSchema,
} from "@repo/shared-lib/zod-schemas";

export const suStaffController = new Hono<RequireAuthMiddlewareEnv>()
  .basePath("/su/staff")
  .use("*", requireAuth, requireSuperUser)
  .post("/", zValidator("json", CreateStaffSchema), async (ctx) => {
    const body = ctx.req.valid("json");

    const staffMember = await createStaff({ ...body, ctxLogger: ctx.var.logger });

    return ctx.json(
      new ApiResponse({
        responseCode: ApiResponseCode.ok,
        message: "Staff created successfully",
        data: { staff: staffMember },
      }),
      201
    );
  })
  .patch(
    "/:staffId/roles",
    zValidator("param", StaffIdParamSchema),
    zValidator("json", UpdateStaffRolesSchema),
    async (ctx) => {
      const { staffId } = ctx.req.valid("param");
      const { roles } = ctx.req.valid("json");
      const actorUserId = Number(ctx.get("user").id);

      const staffMember = await updateStaffRoles({
        staffId,
        roles,
        actorUserId,
        ctxLogger: ctx.var.logger,
      });

      return ctx.json(
        new ApiResponse({
          responseCode: ApiResponseCode.ok,
          message: "Staff roles updated successfully",
          data: { staff: staffMember },
        })
      );
    }
  )
  .patch(
    "/:staffId/status",
    zValidator("param", StaffIdParamSchema),
    zValidator("json", UpdateStaffStatusSchema),
    async (ctx) => {
      const { staffId } = ctx.req.valid("param");
      const { status } = ctx.req.valid("json");
      const actorUserId = Number(ctx.get("user").id);

      const staffMember = await updateStaffStatus({
        staffId,
        status,
        actorUserId,
        ctxLogger: ctx.var.logger,
      });

      return ctx.json(
        new ApiResponse({
          responseCode: ApiResponseCode.ok,
          message: "Staff status updated successfully",
          data: { staff: staffMember },
        })
      );
    }
  );
