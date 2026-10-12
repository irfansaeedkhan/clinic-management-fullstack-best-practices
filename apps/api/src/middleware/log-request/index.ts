import { createMiddleware } from "hono/factory";
import type { HonoAppEnv } from "#src/types/index.ts";
import {
  readRequestBody,
  readResponseBody,
  redactRequestBody,
  redactRequestHeaders,
  redactResponseBody,
  redactResponseHeaders,
} from "./utils.ts";

export const logRequest = createMiddleware<HonoAppEnv>(async (ctx, next) => {
  const startTime = performance.now();

  const req = {
    method: ctx.req.method,
    path: ctx.req.path,
    query: ctx.req.query(),
    url: ctx.req.url,
    headers: redactRequestHeaders(ctx.req),
    body: redactRequestBody(await readRequestBody(ctx)),
  };

  ctx.var.logger.debug("Request received");

  await next();

  ctx.var.logger.info(
    {
      session: {
        userId: ctx.get("user")?.id ?? null,
        userEmail: ctx.get("user")?.email ?? null,
        activeClinicId: ctx.get("activeClinicId") ?? null,
        isSuperUser: ctx.get("isSuperUser") ?? false,
      },
      req,
      res: {
        status: ctx.res.status,
        headers: redactResponseHeaders(ctx.res),
        body: redactResponseBody(await readResponseBody(ctx.res)),
      },
      responseTime: Math.round(performance.now() - startTime),
    },
    "Request completed"
  );
});
