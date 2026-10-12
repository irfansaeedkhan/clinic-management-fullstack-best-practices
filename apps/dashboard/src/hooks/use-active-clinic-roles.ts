import { useQuery } from "@tanstack/react-query";
import { staffHasRole, type StaffRoleName } from "@repo/shared-lib/staff-roles";
import { authClient } from "@/lib/auth-client";
import { listUserClinicsQueryOptions } from "@/queries/clinic";

/**
 * Resolves the current user's roles for the active clinic.
 */
export function useActiveClinicRoles() {
  const { data: session } = authClient.useSession();
  const { data, isLoading } = useQuery(listUserClinicsQueryOptions());

  const isSuperUser = session?.user?.platformRole === "super_user";
  const clinics = data?.data?.clinics ?? [];
  const activeClinic = clinics.find((clinic) => clinic.isActive);
  const roles = activeClinic?.roles ?? [];

  function hasRole(role: StaffRoleName): boolean {
    return (
      // Super users bypass role checks
      isSuperUser || staffHasRole({ roles, role })
    );
  }

  function hasAnyRole(...wanted: StaffRoleName[]): boolean {
    return (
      // Super users bypass role checks
      isSuperUser || wanted.some((role) => staffHasRole({ roles, role }))
    );
  }

  return { roles, isSuperUser, hasRole, hasAnyRole, isLoading };
}
