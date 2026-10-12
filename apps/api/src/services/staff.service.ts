import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PinoLogger } from "hono-pino";
import type { ListStaffQuerySchema, StaffStatusSchema } from "@repo/shared-lib/zod-schemas";
import type { StaffRoleName } from "@repo/shared-lib/staff-roles";
import { db } from "#src/db/index.ts";
import { user, type DBUser } from "#src/db/schema/auth.schema.ts";
import { staff, staffRole, type Staff, type StaffRole } from "#src/db/schema/staff.schema.ts";
import { conflict, forbidden, internalServerError, notFound } from "#src/lib/api-error.ts";
import { createStaffServiceLogger } from "#src/lib/scoped-logger.ts";
import { findClinicById } from "#src/services/clinic.service.ts";
import { findUserById } from "#src/services/user.service.ts";
import type { GetStaffData, ListStaffData, StaffMember } from "#src/types/api-client/index.ts";

/**
 * DB row type for a staff member.
 */
export type StaffMemberRow = {
  staffId: Staff["id"];
  userId: DBUser["id"];
  name: DBUser["name"];
  email: DBUser["email"];
  phone: DBUser["phone"] | null;
  roles: StaffRole["role"][];
  staffStatus: Staff["status"];
  userStatus: DBUser["status"];
  createdAt: Date;
};

/**
 * Maps a database row to a staff member object.
 */
function mapToStaffMember(row: StaffMemberRow): StaffMember {
  return {
    staffId: row.staffId,
    userId: row.userId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    staffStatus: row.staffStatus,
    userStatus: row.userStatus,
    roles: row.roles,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Creates a lateral subquery to get the roles for a staff member.
 */
function createStaffRolesLateralSubquery() {
  return db
    .select({
      roles: sql<StaffRoleName[]>`coalesce(json_agg(${staffRole.role}), '[]'::json)`.as("roles"),
    })
    .from(staffRole)
    .where(eq(staffRole.staffId, staff.id))
    .as("staff_roles");
}

/**
 * Builds the shared select shape and lateral join used by staff member queries.
 */
function buildStaffMemberSelect() {
  const staffRoles = createStaffRolesLateralSubquery();

  return {
    select: {
      staffId: staff.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      staffStatus: staff.status,
      userStatus: user.status,
      createdAt: staff.createdAt,
      roles: staffRoles.roles,
    },
    staffRoles,
  };
}

/**
 * Gets a staff member by their staff ID.
 */
export async function getStaff(params: { staffId: number; clinicId: number }): Promise<GetStaffData> {
  const { staffId, clinicId } = params;
  const { select, staffRoles } = buildStaffMemberSelect();

  const [row] = await db
    .select(select)
    .from(staff)
    .innerJoin(user, eq(staff.userId, user.id))
    .leftJoinLateral(staffRoles, sql`true`)
    .where(and(eq(staff.id, staffId), eq(staff.clinicId, clinicId)))
    .limit(1);

  if (!row) {
    throw notFound({
      message: "Staff member not found",
      logContext: { staffId, clinicId },
    });
  }

  return { staff: mapToStaffMember(row) };
}

/**
 * Finds a staff record for a user at a clinic, optionally filtered by status.
 */
export async function findStaffByUserAndClinic(params: {
  userId: number;
  clinicId: number;
  status?: StaffStatusSchema;
}): Promise<{
  id: Staff["id"];
  userId: Staff["userId"];
  clinicId: Staff["clinicId"];
  status: Staff["status"];
} | null> {
  const { userId, clinicId, status } = params;

  const conditions = [eq(staff.userId, userId), eq(staff.clinicId, clinicId)];

  if (status !== undefined) {
    conditions.push(eq(staff.status, status));
  }

  const [staffRecord] = await db
    .select({
      id: staff.id,
      userId: staff.userId,
      clinicId: staff.clinicId,
      status: staff.status,
    })
    .from(staff)
    .where(and(...conditions))
    .limit(1);

  return staffRecord ?? null;
}

/**
 * Returns role names assigned to a staff record.
 */
export async function getStaffRoleNames(params: { staffId: number }): Promise<StaffRoleName[]> {
  const { staffId } = params;
  const roleRows = await db.select({ role: staffRole.role }).from(staffRole).where(eq(staffRole.staffId, staffId));
  return roleRows.map((row) => row.role);
}

/**
 * Returns clinic IDs where the user has active staff membership.
 */
export async function findActiveStaffClinicIds(params: { userId: number }): Promise<number[]> {
  const { userId } = params;
  const rows = await db
    .select({ clinicId: staff.clinicId })
    .from(staff)
    .where(and(eq(staff.userId, userId), eq(staff.status, "active")))
    .orderBy(asc(staff.clinicId));

  return rows.map((row) => row.clinicId);
}

/**
 * Builds the SQL conditions for listing staff members based on the query parameters.
 */
function buildListStaffConditions(params: {
  clinicId: number;
  status: ListStaffQuerySchema["status"];
  roles: StaffRoleName[] | undefined;
  search: string | undefined;
}) {
  const { clinicId, status, roles, search } = params;
  const staffInRoleFilter = alias(staff, "staff_role_filter");
  const conditions: SQL[] = [eq(staff.clinicId, clinicId)];

  if (status !== undefined && status !== "all") {
    conditions.push(eq(staff.status, status));
  }

  if (roles !== undefined && roles.length > 0) {
    conditions.push(
      inArray(
        staff.id,
        db
          .select({ id: staffRole.staffId })
          .from(staffRole)
          .innerJoin(staffInRoleFilter, eq(staffRole.staffId, staffInRoleFilter.id))
          .where(and(eq(staffInRoleFilter.clinicId, clinicId), inArray(staffRole.role, roles)))
      )
    );
  }

  if (search !== undefined) {
    if (/^\d+$/.test(search)) {
      conditions.push(eq(staff.id, Number(search)));
    } else {
      const pattern = `%${search}%`;
      const searchCondition = or(ilike(user.name, pattern), ilike(user.email, pattern));

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
  }

  return conditions;
}

/**
 * Lists all staff members for a given clinic.
 */
export async function listStaff(params: { clinicId: number; query: ListStaffQuerySchema }): Promise<ListStaffData> {
  const { clinicId, query } = params;

  const conditions = buildListStaffConditions({
    clinicId,
    status: query.status,
    roles: query.role,
    search: query.search,
  });

  const orderByColumn = query.sortBy === "name" ? user.name : staff.createdAt;
  const orderByDirection = query.sortDirection === "asc" ? asc : desc;
  const { select, staffRoles } = buildStaffMemberSelect();

  const rows = await db
    .select(select)
    .from(staff)
    .innerJoin(user, eq(staff.userId, user.id))
    .leftJoinLateral(staffRoles, sql`true`)
    .where(and(...conditions))
    .orderBy(orderByDirection(orderByColumn));

  const staffMembers = rows.map(mapToStaffMember);

  return { staff: staffMembers };
}

/**
 * Links an existing user to a clinic as staff (no roles assigned).
 */
export async function createStaff(params: {
  userId: number;
  clinicId: number;
  ctxLogger: PinoLogger;
}): Promise<StaffMember> {
  const { userId, clinicId, ctxLogger } = params;
  const logger = createStaffServiceLogger({ logger: ctxLogger });

  logger.info({ userId, clinicId }, "Creating staff");

  const userRecord = await findUserById({ userId });

  if (!userRecord) {
    throw notFound({ message: "User not found", logContext: { userId } });
  }

  if (userRecord.status !== "active") {
    throw forbidden({
      message: "Cannot create staff for user that is not active",
      logContext: { userId, status: userRecord.status },
    });
  }

  if (userRecord.platformRole === "super_user") {
    throw forbidden({
      message: "Cannot create staff for super user",
      logContext: { userId },
    });
  }

  const clinicRecord = await findClinicById({ clinicId });

  if (!clinicRecord) {
    throw notFound({ message: "Clinic not found", logContext: { clinicId } });
  }

  const existingStaff = await findStaffByUserAndClinic({ userId, clinicId });

  if (existingStaff) {
    throw conflict({
      message: "User is already a staff member of this clinic",
      logContext: { userId, clinicId },
    });
  }

  const [createdMembership] = await db
    .insert(staff)
    .values({
      userId,
      clinicId,
      status: "active",
    })
    .returning({ id: staff.id });

  if (!createdMembership) {
    throw internalServerError({
      message: "Staff was created but not found",
      logContext: { userId, clinicId },
    });
  }

  logger.info({ userId, clinicId, staffId: createdMembership.id }, "Staff created");

  const { staff: staffMember } = await getStaff({ staffId: createdMembership.id, clinicId });

  return staffMember;
}

/**
 * Requires a staff membership for a given staff ID and optional clinic ID.
 */
async function requireStaffMembership(params: { staffId: number; clinicId?: number | undefined }) {
  const { staffId, clinicId } = params;

  const conditions = [eq(staff.id, staffId)];

  if (clinicId != null) {
    conditions.push(eq(staff.clinicId, clinicId));
  }

  const [staffMember] = await db
    .select({
      id: staff.id,
      userId: staff.userId,
      clinicId: staff.clinicId,
      status: staff.status,
    })
    .from(staff)
    .where(and(...conditions))
    .limit(1);

  if (!staffMember) {
    throw notFound({
      message: "Staff member not found",
      logContext: { staffId, clinicId },
    });
  }

  return staffMember;
}

/**
 * When updating own roles, admin must retain the admin role.
 */
function assertCanUpdateStaffRoles(params: { actorUserId: number; targetUserId: number; roles: StaffRoleName[] }) {
  const { actorUserId, targetUserId, roles } = params;

  if (actorUserId === targetUserId && !roles.includes("admin")) {
    throw forbidden({
      message: "You cannot remove the admin role from your own account",
      logContext: { userId: actorUserId },
    });
  }
}

/**
 * Prevents an admin from changing their own membership status.
 */
function assertNotSelfStatusUpdate(params: { actorUserId: number; targetUserId: number }) {
  const { actorUserId, targetUserId } = params;

  if (actorUserId === targetUserId) {
    throw forbidden({
      message: "You cannot change your own membership status",
      logContext: { userId: actorUserId },
    });
  }
}

/**
 * Updates roles for a staff member (full replace).
 * Pass `clinicId` for clinic-admin updates (enforces clinic scope).
 */
export async function updateStaffRoles(params: {
  staffId: number;
  roles: StaffRoleName[];
  ctxLogger: PinoLogger;
  actorUserId: number;
  clinicId?: number;
}): Promise<StaffMember> {
  const { staffId, roles, ctxLogger, clinicId, actorUserId } = params;
  const logger = createStaffServiceLogger({ logger: ctxLogger });

  logger.info({ staffId, clinicId, actorUserId, roles }, "Updating staff roles");

  const staffRecord = await requireStaffMembership({
    staffId,
    clinicId,
  });

  assertCanUpdateStaffRoles({ actorUserId, targetUserId: staffRecord.userId, roles });

  const existingRoles = await db
    .select({ role: staffRole.role })
    .from(staffRole)
    .where(eq(staffRole.staffId, staffRecord.id));

  const currentRoles = existingRoles.map((row) => row.role);
  const currentRoleSet = new Set(currentRoles);

  const incomingRoles = [...new Set(roles)];
  const incomingRoleSet = new Set(incomingRoles);

  const rolesToAdd = incomingRoles.filter((role) => !currentRoleSet.has(role));
  const rolesToRemove = currentRoles.filter((role) => !incomingRoleSet.has(role));

  logger.info({ rolesToAdd, rolesToRemove }, "Roles to add and remove");

  await db.transaction(async (tx) => {
    if (rolesToRemove.length > 0) {
      await tx
        .delete(staffRole)
        .where(and(eq(staffRole.staffId, staffRecord.id), inArray(staffRole.role, rolesToRemove)));

      logger.info({ rolesToRemove }, "Roles removed");
    }

    if (rolesToAdd.length > 0) {
      await tx.insert(staffRole).values(
        rolesToAdd.map((role) => ({
          staffId: staffRecord.id,
          role,
        }))
      );
      logger.info({ rolesToAdd }, "Roles added");
    }
  });

  logger.info({ staffId, roles: incomingRoles }, "Staff member roles updated");

  const { staff: staffMember } = await getStaff({ staffId: staffRecord.id, clinicId: staffRecord.clinicId });

  return staffMember;
}

/**
 * Updates staff membership status.
 * Pass `clinicId` for clinic-admin updates (enforces clinic scope).
 */
export async function updateStaffStatus(params: {
  staffId: number;
  status: StaffStatusSchema;
  ctxLogger: PinoLogger;
  actorUserId: number;
  clinicId?: number;
}): Promise<StaffMember> {
  const { staffId, status, ctxLogger, clinicId, actorUserId } = params;
  const logger = createStaffServiceLogger({ logger: ctxLogger });

  const staffRecord = await requireStaffMembership({
    staffId,
    clinicId,
  });

  assertNotSelfStatusUpdate({ actorUserId, targetUserId: staffRecord.userId });

  logger.info({ staffId, clinicId, actorUserId, previousStatus: staffRecord.status, status }, "Updating staff status");

  const [updatedStaff] = await db.update(staff).set({ status }).where(eq(staff.id, staffId)).returning({
    id: staff.id,
  });

  if (!updatedStaff) {
    throw notFound({ message: "Staff member not found", logContext: { staffId } });
  }

  logger.info({ staffId, status }, "Staff member status updated");

  const { staff: staffMember } = await getStaff({ staffId, clinicId: staffRecord.clinicId });

  return staffMember;
}
