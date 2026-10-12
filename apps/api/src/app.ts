import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { pinoLogger } from "hono-pino";
import { ApiResponse, ApiResponseCode } from "@repo/shared-lib/api-response";
import { env } from "#src/config/env.ts";
import { payloadTooLarge } from "#src/lib/api-error.ts";
import { auth } from "#src/lib/auth.ts";
import { createLogger } from "#src/lib/logger.ts";
import { loadSession } from "#src/middleware/load-session.ts";
import { clinicController } from "#src/controllers/clinic.controller.ts";
import { sessionController } from "#src/controllers/session.controller.ts";
import { staffController } from "#src/controllers/staff.controller.ts";
import { suClinicController } from "#src/controllers/su-clinic.controller.ts";
import { suStaffController } from "#src/controllers/su-staff.controller.ts";
import { suUserController } from "#src/controllers/su-user.controller.ts";
import { globalErrorHandler } from "#src/middleware/global-error-handler.ts";
import { logRequest } from "#src/middleware/log-request/index.ts";
import type { HonoAppEnv } from "#src/types/index.ts";

export const app = new Hono<HonoAppEnv>()
  .use(requestId())
  .use(
    pinoLogger({
      pino: createLogger(),
      nodeRuntime: true,
      http: false,
    })
  )
  .use(async (c, next) => {
    c.var.logger.assign({ reqId: c.var.requestId });
    await next();
  })
  .use(
    bodyLimit({
      maxSize: 100 * 1024, // 100KB
      onError: () => {
        throw payloadTooLarge();
      },
    })
  )
  .use(logRequest)
  .use(
    "*",
    cors({
      origin: env.DASHBOARD_URL,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    })
  )
  .use("*", loadSession)
  .basePath("/api")
  .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/", suUserController)
  .route("/", suStaffController)
  .route("/", suClinicController)
  .route("/", clinicController)
  .route("/", staffController)
  .route("/", sessionController)
  .get("/", (c) => {
    return c.json(
      new ApiResponse({
        responseCode: ApiResponseCode.ok,
        message: "CMS API is running",
        data: {
          name: env.APP_NAME,
        },
      })
    );
  })
  .notFound((c) => {
    return c.json(
      new ApiResponse({
        responseCode: ApiResponseCode.path_not_found,
        message: "Path not found",
        data: {
          method: c.req.method,
          path: c.req.path,
        },
      }),
      404
    );
  })
  .onError(globalErrorHandler);
