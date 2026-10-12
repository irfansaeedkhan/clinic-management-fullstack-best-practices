import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { staffRoleNamesArray, type StaffRoleName } from "@repo/shared-lib/staff-roles";
import { user } from "#src/db/schema/auth.schema.ts";
import { clinic } from "#src/db/schema/clinic.schema.ts";

export const staffStatusEnum = pgEnum("staff_status", ["active", "inactive"]);

export const staffRoleEnum = pgEnum("staff_role_enum", staffRoleNamesArray as [StaffRoleName, ...StaffRoleName[]]);

export const staff = pgTable(
  "staff",
  {
    id: integer().generatedByDefaultAsIdentity().primaryKey(),
    userId: integer()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clinicId: integer()
      .notNull()
      .references(() => clinic.id, { onDelete: "cascade" }),
    status: staffStatusEnum().notNull().default("active"),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("staff_user_id_clinic_id_unique").on(table.userId, table.clinicId)]
);
export type Staff = typeof staff.$inferSelect;

export const staffRole = pgTable(
  "staff_role",
  {
    id: integer().generatedByDefaultAsIdentity().primaryKey(),
    staffId: integer()
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    role: staffRoleEnum().notNull(),
  },
  (table) => [uniqueIndex("staff_role_staff_id_role_unique").on(table.staffId, table.role)]
);
export type StaffRole = typeof staffRole.$inferSelect;

export const staffRelations = relations(staff, ({ one, many }) => ({
  user: one(user, {
    fields: [staff.userId],
    references: [user.id],
  }),
  clinic: one(clinic, {
    fields: [staff.clinicId],
    references: [clinic.id],
  }),
  roles: many(staffRole),
}));

export const staffRoleRelations = relations(staffRole, ({ one }) => ({
  staff: one(staff, {
    fields: [staffRole.staffId],
    references: [staff.id],
  }),
}));
