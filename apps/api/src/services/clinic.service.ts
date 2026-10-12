import { and, eq, inArray } from "drizzle-orm";
import type { StaffRoleName } from "@repo/shared-lib/staff-roles";
import { db } from "#src/db/index.ts";
import { clinic, type Clinic } from "#src/db/schema/clinic.schema.ts";
import { staff, staffRole } from "#src/db/schema/staff.schema.ts";
import { findStaffByUserAndClinic, getStaffRoleNames } from "#src/services/staff.service.ts";
import type { User } from "#src/types/auth.types.ts";
import type { ListUserClinicsData, ListUserClinicsItem } from "#src/types/api-client/index.ts";
import { internalServerError } from "#src/lib/api-error.ts";

export async function createClinic(params: { name: string }): Promise<Clinic> {
  const [createdClinic] = await db.insert(clinic).values({ name: params.name }).returning({
    id: clinic.id,
    name: clinic.name,
  });

  if (!createdClinic) {
    throw internalServerError({ message: "Clinic was created but not found", logContext: { name: params.name } });
  }

  return createdClinic;
}

export async function findClinicById(params: { clinicId: number }): Promise<Clinic | null> {
  const { clinicId } = params;
  const [clinicRecord] = await db.select().from(clinic).where(eq(clinic.id, clinicId)).limit(1);
  return clinicRecord ?? null;
}

export async function loadClinicContext(params: {
  user: User;
  activeClinicId: number | null | undefined;
  isSuperUser: boolean;
}) {
  const { user, activeClinicId, isSuperUser } = params;

  if (isSuperUser) {
    return {
      activeClinicId: activeClinicId ?? null,
      staffRoles: [],
    };
  }

  if (activeClinicId == null) {
    return {
      activeClinicId: null,
      staffRoles: [],
    };
  }

  const staffRecord = await findStaffByUserAndClinic({
    userId: Number(user.id),
    clinicId: activeClinicId,
    status: "active",
  });

  if (!staffRecord) {
    return {
      activeClinicId: null,
      staffRoles: [],
    };
  }

  const staffRoles = await getStaffRoleNames({ staffId: staffRecord.id });

  return {
    activeClinicId,
    staffRoles,
  };
}

export async function listUserClinics(params: {
  userId: number;
  activeClinicId: number | null | undefined;
}): Promise<ListUserClinicsData> {
  const { userId, activeClinicId } = params;

  const staffRows = await db
    .select({
      staffId: staff.id,
      clinicId: clinic.id,
      clinicName: clinic.name,
    })
    .from(staff)
    .innerJoin(clinic, eq(staff.clinicId, clinic.id))
    .where(and(eq(staff.userId, userId), eq(staff.status, "active")));

  if (staffRows.length === 0) {
    return { clinics: [] };
  }

  const staffIds = staffRows.map((row) => row.staffId);

  const roleRows = await db
    .select({
      staffId: staffRole.staffId,
      role: staffRole.role,
    })
    .from(staffRole)
    .where(inArray(staffRole.staffId, staffIds));

  const rolesByStaffId = new Map<number, StaffRoleName[]>();

  for (const row of roleRows) {
    const roles = rolesByStaffId.get(row.staffId) ?? [];
    roles.push(row.role);
    rolesByStaffId.set(row.staffId, roles);
  }

  const clinics: ListUserClinicsItem[] = staffRows.map((row) => ({
    id: row.clinicId,
    name: row.clinicName,
    roles: rolesByStaffId.get(row.staffId) ?? [],
    isActive: activeClinicId != null && row.clinicId === activeClinicId,
  }));

  return {
    clinics: clinics.toSorted((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }),
  };
}
