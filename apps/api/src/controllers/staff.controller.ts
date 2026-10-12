import { Hono } from "hono";
import { ApiResponse, ApiResponseCode } from "@repo/shared-lib/api-response";
import {
  ListStaffQuerySchema,
  StaffIdParamSchema,
  UpdateStaffRolesSchema,
  UpdateStaffStatusSchema,
} from "@repo/shared-lib/zod-schemas";
import { zValidator } from "#src/lib/zod-validator-wrapper.ts";
import { requireActiveClinic, type RequireActiveClinicMiddlewareEnv } from "#src/middleware/require-active-clinic.ts";
import { requireAuth } from "#src/middleware/require-auth.ts";
import { requireStaffRole } from "#src/middleware/require-staff-role.ts";
import { getStaff, listStaff, updateStaffRoles, updateStaffStatus } from "#src/services/staff.service.ts";
import type { GetStaffData, ListStaffData } from "#src/types/api-client/index.ts";

export const staffController = new Hono<RequireActiveClinicMiddlewareEnv>()
  .basePath("/staff")
  .use("*", requireAuth, requireActiveClinic)
  .get("/", zValidator("query", ListStaffQuerySchema), async (ctx) => {
    const query = ctx.req.valid("query");
    const activeClinicId = ctx.get("activeClinicId");

    const data = await listStaff({
      clinicId: activeClinicId,
      query,
    });

    return ctx.json(
      new ApiResponse<ListStaffData>({
        responseCode: ApiResponseCode.ok,
        message: "Staff retrieved successfully",
        data,
      })
    );
  })
  .get("/:staffId", zValidator("param", StaffIdParamSchema), async (ctx) => {
    const { staffId } = ctx.req.valid("param");
    const activeClinicId = ctx.get("activeClinicId");

    const data = await getStaff({
      staffId,
      clinicId: activeClinicId,
    });

    return ctx.json(
      new ApiResponse<GetStaffData>({
        responseCode: ApiResponseCode.ok,
        message: "Staff member retrieved successfully",
        data,
      })
    );
  })
  .patch(
    "/:staffId/roles",
    requireStaffRole("admin"),
    zValidator("param", StaffIdParamSchema),
    zValidator("json", UpdateStaffRolesSchema),
    async (ctx) => {
      const { staffId } = ctx.req.valid("param");
      const { roles } = ctx.req.valid("json");
      const user = ctx.get("user");
      const activeClinicId = ctx.get("activeClinicId");

      const staffMember = await updateStaffRoles({
        staffId,
        clinicId: activeClinicId,
        actorUserId: Number(user.id),
        roles,
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
    requireStaffRole("admin"),
    zValidator("param", StaffIdParamSchema),
    zValidator("json", UpdateStaffStatusSchema),
    async (ctx) => {
      const { staffId } = ctx.req.valid("param");
      const { status } = ctx.req.valid("json");
      const user = ctx.get("user");
      const activeClinicId = ctx.get("activeClinicId");

      const staffMember = await updateStaffStatus({
        staffId,
        clinicId: activeClinicId,
        actorUserId: Number(user.id),
        status,
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
