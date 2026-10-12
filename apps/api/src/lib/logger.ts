import pino from "pino";
import { env } from "#src/config/env.ts";

const validLevels = ["fatal", "error", "warn", "info", "debug", "trace"] as const;

/**
 * Get log level from environment variable or default to 'info'
 */
function getLogLevel(): pino.Level {
  const level = process.env.LOG_LEVEL?.toLowerCase();

  if (level && validLevels.includes(level as (typeof validLevels)[number])) {
    return level as pino.Level;
  }

  return "info";
}

/**
 * Create a pino logger instance
 */
export function createLogger(options?: pino.LoggerOptions) {
  return pino({
    enabled: true,
    level: getLogLevel(),
    serializers: {
      err: pino.stdSerializers.errWithCause,
      error: pino.stdSerializers.errWithCause,
    },
    ...options,
    ...(env.APP_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
            },
          },
        }
      : {}),
  });
}
