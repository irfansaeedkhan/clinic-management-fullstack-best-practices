import type { Context, ErrorHandler } from "hono";
import { ApiResponseCode, type ErrorResponse } from "@repo/shared-lib/api-response";
import { ApiError, type ApiErrorLogLevel } from "#src/lib/api-error.ts";
import type { HonoAppEnv } from "#src/types/index.ts";

function getErrorLogLevel(error: Error): ApiErrorLogLevel {
  if (error instanceof ApiError && error.logLevel) {
    return error.logLevel;
  }
  return "error";
}

function formatErrorResponse(error: Error, context: Context): ErrorResponse {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return {
      responseCode: error.responseCode,
      message: error.message,
      statusCode: error.statusCode,
      path: context.req.path,
      ...(error.details !== undefined ? { details: error.details } : {}),
    };
  }

  // Handle unexpected errors
  return {
    responseCode: ApiResponseCode.internal_server_error,
    message: "An unexpected error occurred",
    statusCode: 500,
    path: context.req.path,
  };
}

export const globalErrorHandler: ErrorHandler<HonoAppEnv> = (err, c) => {
  const errorResponse = formatErrorResponse(err, c);

  const level = getErrorLogLevel(err);

  c.var.logger[level]({ err, errorResponse }, errorResponse.message);

  const { statusCode, ...rest } = errorResponse;
  return c.json(rest, statusCode);
};
