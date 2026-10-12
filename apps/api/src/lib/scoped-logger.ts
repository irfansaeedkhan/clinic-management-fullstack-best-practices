import type { PinoLogger } from "hono-pino";
import type pino from "pino";

type ScopedLoggerScope = "user.service" | "staff.service";

function createScopedLogger(params: { logger: PinoLogger; scope: ScopedLoggerScope }): pino.Logger {
  return params.logger._logger.child({}, { msgPrefix: `[${params.scope}] ` });
}

export function createUserServiceLogger(params: { logger: PinoLogger }): pino.Logger {
  return createScopedLogger({ logger: params.logger, scope: "user.service" });
}

export function createStaffServiceLogger(params: { logger: PinoLogger }): pino.Logger {
  return createScopedLogger({ logger: params.logger, scope: "staff.service" });
}
