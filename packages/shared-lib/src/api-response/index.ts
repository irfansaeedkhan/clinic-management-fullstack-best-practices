import type { ContentfulStatusCode } from "hono/utils/http-status";

export const ApiResponseCode = {
  ok: "ok",
  path_not_found: "path_not_found",
  internal_server_error: "internal_server_error",
  resource_not_found: "resource_not_found",
  unauthorized: "unauthorized",
  conflict: "conflict",
  forbidden: "forbidden",
  bad_request: "bad_request",
  payload_too_large: "payload_too_large",
  input_validation_failed: "input_validation_failed",
} as const;

export type ApiResponseCode = (typeof ApiResponseCode)[keyof typeof ApiResponseCode];

export type ApiResponseBody<T = unknown> = [T] extends [void]
  ? {
      responseCode: ApiResponseCode;
      message: string;
      data?: never;
    }
  : unknown extends T
    ? {
        responseCode: ApiResponseCode;
        message: string;
        data?: T;
      }
    : {
        responseCode: ApiResponseCode;
        message: string;
        data: T;
      };

export class ApiResponse<T = unknown> {
  responseCode: ApiResponseCode;
  message: string;
  data: T;

  constructor(response: ApiResponseBody<T>) {
    this.responseCode = response.responseCode;
    this.message = response.message;
    this.data = response.data as T;
  }
}

export interface ErrorResponse {
  statusCode: ContentfulStatusCode;
  responseCode: ApiResponseCode;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}
