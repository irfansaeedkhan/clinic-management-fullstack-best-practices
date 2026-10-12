import type { ValidationTargets } from "hono";
import { flattenError, type ZodType } from "zod";
import { zValidator as zv } from "@hono/zod-validator";
import { ApiResponseCode } from "@repo/shared-lib/api-response";
import { ApiError } from "#src/lib/api-error.ts";

const zValidator = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      throw new ApiError({
        responseCode: ApiResponseCode.input_validation_failed,
        message: "Input validation failed",
        statusCode: 400,
        logLevel: "warn",
        details: {
          flattenError: flattenError(result.error),
          issues: result.error.issues,
        },
      });
    }
  });

export { zValidator };
