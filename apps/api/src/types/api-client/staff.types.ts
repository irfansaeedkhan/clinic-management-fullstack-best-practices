import type { ApiResponseBody } from "@repo/shared-lib/api-response";
import type { StaffMemberRow } from "#src/services/staff.service.ts";

export type StaffMember = Omit<StaffMemberRow, "createdAt"> & {
  createdAt: string;
};

export type ListStaffData = {
  staff: StaffMember[];
};

export type GetStaffData = {
  staff: StaffMember;
};

export type ListStaffResponse = ApiResponseBody<ListStaffData>;
export type GetStaffResponse = ApiResponseBody<GetStaffData>;
