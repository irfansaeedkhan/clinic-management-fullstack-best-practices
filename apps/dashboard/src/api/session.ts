import type { SwitchClinicSchema } from "@repo/shared-lib/zod-schemas";
import type { ApiResponseBody } from "@repo/shared-lib/api-response";
import { apiClient } from "@/api/client";

export async function switchClinic(params: SwitchClinicSchema): Promise<ApiResponseBody<void>> {
  return apiClient.patch("session/switch-clinic", { json: params }).json<ApiResponseBody<void>>();
}
