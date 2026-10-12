import type { ListUserClinicsResponse } from "@repo/api/client-types";
import { apiClient } from "@/api/client";

export async function listUserClinics(): Promise<ListUserClinicsResponse> {
  return apiClient.get("clinics").json<ListUserClinicsResponse>();
}
