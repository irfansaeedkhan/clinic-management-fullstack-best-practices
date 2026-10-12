import type { ContentfulStatusCode } from "hono/utils/http-status";
import { type Level } from "pino";
import { ApiResponseCode } from "@repo/shared-lib/api-response";

export type ApiErrorLogLevel = Level;

export class ApiError extends Error {
  public readonly responseCode: ApiResponseCode;
  public readonly statusCode: ContentfulStatusCode;
  public readonly details?: Record<string, unknown> | undefined;
  public readonly logContext?: Record<string, unknown> | undefined;
  public readonly logLevel: ApiErrorLogLevel | undefined;

  constructor({
    responseCode,
    message,
    statusCode,
    details,
    logContext,
    logLevel,
  }: {
    responseCode: ApiResponseCode;
    message: string;
    statusCode: ContentfulStatusCode;
    /**
     * Additional details to include in the error response.
     * Returned to the client.
     */
    details?: Record<string, unknown> | undefined;
    /**
     * Additional context for server logs only.
     * Never returned to the client.
     */
    logContext?: Record<string, unknown> | undefined;
    logLevel?: ApiErrorLogLevel;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.responseCode = responseCode;
    this.statusCode = statusCode;
    this.details = details;
    this.logContext = logContext;
    this.logLevel = logLevel;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

type ApiErrorOptionalParams = {
  message?: string;
  details?: Record<string, unknown>;
  logContext?: Record<string, unknown>;
  logLevel?: ApiErrorLogLevel;
};

export function unauthorized(params: ApiErrorOptionalParams = {}) {
  const { message = "Unauthorized", details, logContext, logLevel = "warn" } = params;
  return new ApiError({
    responseCode: ApiResponseCode.unauthorized,
    message,
    statusCode: 401,
    logLevel,
    details,
    logContext,
  });
}

export function forbidden(params: ApiErrorOptionalParams = {}) {
  const { message = "Forbidden", details, logContext, logLevel = "warn" } = params;
  return new ApiError({
    responseCode: ApiResponseCode.forbidden,
    message,
    statusCode: 403,
    logLevel,
    details,
    logContext,
  });
}

export function badRequest(params: ApiErrorOptionalParams = {}) {
  const { message = "Bad request", details, logContext, logLevel = "warn" } = params;
  return new ApiError({
    responseCode: ApiResponseCode.bad_request,
    message,
    statusCode: 400,
    logLevel,
    details,
    logContext,
  });
}

export function payloadTooLarge(params: ApiErrorOptionalParams = {}) {
  const { message = "Request body too large", details, logContext, logLevel = "warn" } = params;
  return new ApiError({
    responseCode: ApiResponseCode.payload_too_large,
    message,
    statusCode: 413,
    logLevel,
    details,
    logContext,
  });
}

export function notFound(params: ApiErrorOptionalParams = {}) {
  const { message = "Resource not found", details, logContext, logLevel = "warn" } = params;
  return new ApiError({
    responseCode: ApiResponseCode.resource_not_found,
    message,
    statusCode: 404,
    logLevel,
    details,
    logContext,
  });
}

export function conflict(params: ApiErrorOptionalParams = {}) {
  const { message = "Conflict", details, logContext, logLevel = "warn" } = params;
  return new ApiError({
    responseCode: ApiResponseCode.conflict,
    message,
    statusCode: 409,
    logLevel,
    details,
    logContext,
  });
}

export function internalServerError(params: ApiErrorOptionalParams = {}) {
  const { message = "Internal server error", details, logContext, logLevel = "error" } = params;
  return new ApiError({
    responseCode: ApiResponseCode.internal_server_error,
    message,
    statusCode: 500,
    logLevel,
    details,
    logContext,
  });
}
