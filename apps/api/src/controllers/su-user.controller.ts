import { Hono } from "hono";
import { zValidator } from "#src/lib/zod-validator-wrapper.ts";
import { requireAuth, type RequireAuthMiddlewareEnv } from "#src/middleware/require-auth.ts";
import { requireSuperUser } from "#src/middleware/require-super-user.ts";
import { updateUserStatus } from "#src/services/user.service.ts";
import { ApiResponse, ApiResponseCode } from "@repo/shared-lib/api-response";
import { UpdateUserStatusSchema, UserIdParamSchema } from "@repo/shared-lib/zod-schemas";

export const suUserController = new Hono<RequireAuthMiddlewareEnv>()
  .basePath("/su/users")
  .use("*", requireAuth, requireSuperUser)
  .patch(
    "/:userId/status",
    zValidator("param", UserIdParamSchema),
    zValidator("json", UpdateUserStatusSchema),
    async (ctx) => {
      const { userId } = ctx.req.valid("param");
      const { status } = ctx.req.valid("json");

      const user = await updateUserStatus({ userId, status, ctxLogger: ctx.var.logger });

      return ctx.json(
        new ApiResponse({
          responseCode: ApiResponseCode.ok,
          message: "User status updated successfully",
          data: { user },
        })
      );
    }
  );
