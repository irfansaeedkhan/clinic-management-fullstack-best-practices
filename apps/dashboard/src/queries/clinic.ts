import { queryOptions } from "@tanstack/react-query";
import ms from "ms";
import type { ListUserClinicsResponse } from "@repo/api/client-types";
import { listUserClinics } from "@/api/clinic";

export const clinicKeys = {
  all: ["clinics"] as const,
  lists: () => [...clinicKeys.all, "list"] as const,
  list: () => [...clinicKeys.lists()] as const,
};

export function listUserClinicsQueryOptions(
  overrides?: Omit<Parameters<typeof queryOptions<ListUserClinicsResponse>>[0], "queryKey" | "queryFn">
) {
  return queryOptions({
    queryKey: clinicKeys.list(),
    queryFn: listUserClinics,
    staleTime: ms("5m"),
    ...overrides,
  });
}
