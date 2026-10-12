import { eq } from "drizzle-orm";
import { db, type Tx } from "#src/db/index.ts";
import { session } from "#src/db/schema/auth.schema.ts";
import { findClinicById } from "#src/services/clinic.service.ts";
import { findStaffByUserAndClinic, findActiveStaffClinicIds } from "#src/services/staff.service.ts";
import { forbidden, notFound } from "#src/lib/api-error.ts";
import type { User } from "#src/types/auth.types.ts";

export async function revokeAllUserSessions(params: { userId: number; tx?: Tx }): Promise<void> {
  const { userId, tx } = params;
  const dbClient = tx ?? db;
  await dbClient.delete(session).where(eq(session.userId, userId));
}

export async function resolveActiveClinicIdOnLogin(params: { sessionId: number; userId: number }): Promise<void> {
  const { sessionId, userId } = params;

  const activeStaffClinicIds = await findActiveStaffClinicIds({ userId });

  // Only auto-select when the user belongs to exactly one clinic.
  // Multiple clinics stay unset so the user picks one in the clinic switcher.
  if (activeStaffClinicIds.length !== 1) {
    return;
  }

  await db.update(session).set({ activeClinicId: activeStaffClinicIds[0] }).where(eq(session.id, sessionId));
}

async function validateClinicSwitch(params: {
  user: User;
  clinicId: number | null;
  isSuperUser: boolean;
}): Promise<number | null> {
  const { user, clinicId, isSuperUser } = params;

  if (clinicId == null) {
    if (!isSuperUser) {
      throw forbidden({ message: "Only super users can enter platform mode", logContext: { userId: user.id } });
    }

    return null;
  }

  const clinicRecord = await findClinicById({ clinicId });

  if (!clinicRecord) {
    throw notFound({ message: "Clinic not found", logContext: { clinicId } });
  }

  if (isSuperUser) {
    return clinicId;
  }

  const staffRecord = await findStaffByUserAndClinic({
    userId: Number(user.id),
    clinicId,
    status: "active",
  });

  if (!staffRecord) {
    throw forbidden({ message: "You are not staff at this clinic", logContext: { userId: user.id, clinicId } });
  }

  return clinicId;
}

export async function switchClinic(params: {
  user: User;
  sessionId: number;
  clinicId: number | null;
  isSuperUser: boolean;
}) {
  const activeClinicId = await validateClinicSwitch({
    user: params.user,
    clinicId: params.clinicId,
    isSuperUser: params.isSuperUser,
  });

  const [updatedSession] = await db
    .update(session)
    .set({ activeClinicId })
    .where(eq(session.id, params.sessionId))
    .returning({
      id: session.id,
      activeClinicId: session.activeClinicId,
    });

  return updatedSession;
}
