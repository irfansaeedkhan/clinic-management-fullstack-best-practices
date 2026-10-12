import { mutationOptions } from "@tanstack/react-query";
import type { ApiResponseBody } from "@repo/shared-lib/api-response";
import type { SwitchClinicSchema } from "@repo/shared-lib/zod-schemas";
import { switchClinic } from "@/api/session";

export function switchClinicMutationOptions(
  params?: Omit<
    Parameters<typeof mutationOptions<ApiResponseBody<void>, Error, SwitchClinicSchema>>[0],
    "mutationFn"
  > & {
    reloadOnSuccess?: boolean;
  }
) {
  const { reloadOnSuccess = true, onSuccess, ...overrides } = params ?? {};

  return mutationOptions({
    mutationFn: switchClinic,
    onSuccess: (...args) => {
      onSuccess?.(...args);

      if (reloadOnSuccess) {
        window.location.reload();
      }
    },
    ...overrides,
  });
}
