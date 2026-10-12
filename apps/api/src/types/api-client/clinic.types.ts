import type { StaffRoleName } from "@repo/shared-lib/staff-roles";
import type { ApiResponseBody } from "@repo/shared-lib/api-response";

export type ListUserClinicsItem = {
  id: number;
  name: string;
  roles: StaffRoleName[];
  isActive: boolean;
};

export type ListUserClinicsData = {
  clinics: ListUserClinicsItem[];
};

export type ListUserClinicsResponse = ApiResponseBody<ListUserClinicsData>;
