import type { ReactNode } from "react";
import type { StaffRoleName } from "@repo/shared-lib/staff-roles";
import { useActiveClinicRoles } from "@/hooks/use-active-clinic-roles";

type RequireRoleProps = {
  /** Role(s) allowed to see the children */
  role: StaffRoleName | StaffRoleName[];
  /** Rendered when the user lacks the required role(s) */
  fallback?: ReactNode;
  children: ReactNode;
};

export function RequireRole({ role, fallback = null, children }: RequireRoleProps) {
  const { hasAnyRole, isLoading } = useActiveClinicRoles();

  // Avoid flashing the fallback while roles are still loading
  if (isLoading) return null;

  const requiredRoles = Array.isArray(role) ? role : role ? [role] : [];

  if (requiredRoles.length === 0) {
    throw new Error("RequireRole: role cannot be empty");
  }

  const allowed = hasAnyRole(...requiredRoles);

  return <>{allowed ? children : fallback}</>;
}
