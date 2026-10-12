import type { PinoLogger } from "hono-pino";
import type { UserStatusSchema } from "@repo/shared-lib/zod-schemas";
import { eq } from "drizzle-orm";
import { db } from "#src/db/index.ts";
import { user, type DBUser } from "#src/db/schema/auth.schema.ts";
import { notFound } from "#src/lib/api-error.ts";
import { createUserServiceLogger } from "#src/lib/scoped-logger.ts";
import { revokeAllUserSessions } from "#src/services/session.service.ts";

export async function findUserById(params: { userId: number }): Promise<DBUser | null> {
  const { userId } = params;
  const userRecord = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.id, userId),
  });
  return userRecord ?? null;
}

export async function findUserStatusById(params: { userId: number }): Promise<Pick<DBUser, "id" | "status"> | null> {
  const { userId } = params;
  const userRecord = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.id, userId),
    columns: { id: true, status: true },
  });
  return userRecord ?? null;
}

export async function updateUserStatus(params: { userId: number; status: UserStatusSchema; ctxLogger: PinoLogger }) {
  const { userId, status, ctxLogger } = params;
  const logger = createUserServiceLogger({ logger: ctxLogger });

  const existingUser = await findUserById({ userId });

  if (!existingUser) {
    throw notFound({ message: "User not found", logContext: { userId } });
  }

  logger.info({ userId, previousStatus: existingUser.status, status }, "Updating user status");

  const updatedUser = await db.transaction(async (tx) => {
    if (status !== "active") {
      await revokeAllUserSessions({ userId, tx });
    }

    const [userRecord] = await tx.update(user).set({ status }).where(eq(user.id, userId)).returning({
      id: user.id,
      email: user.email,
      status: user.status,
    });

    if (!userRecord) {
      throw notFound({ message: "User not found", logContext: { userId } });
    }

    return userRecord;
  });

  logger.info({ userId, status: updatedUser.status }, "User status updated");

  return updatedUser;
}
