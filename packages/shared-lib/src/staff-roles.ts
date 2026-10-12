export const staffRoleNames = {
  admin: "admin",
  doctor: "doctor",
  receptionist: "receptionist",
} as const;

export type StaffRoleName = (typeof staffRoleNames)[keyof typeof staffRoleNames];

export const staffRoleNamesArray = Object.values(staffRoleNames);

const rolesInheritedByAdmin: readonly StaffRoleName[] = [staffRoleNames.doctor, staffRoleNames.receptionist];

/**
 * Admin is a superset of doctor and receptionist.
 * A direct role match always counts. An admin also satisfies doctor and receptionist checks.
 */
export function staffHasRole(params: { roles: readonly StaffRoleName[]; role: StaffRoleName }): boolean {
  const { roles, role } = params;

  if (roles.includes(role)) {
    return true;
  }

  return roles.includes(staffRoleNames.admin) && rolesInheritedByAdmin.includes(role);
}
