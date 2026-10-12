import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { staff } from "#src/db/schema/staff.schema.ts";

export const clinic = pgTable("clinic", {
  id: integer().generatedByDefaultAsIdentity().primaryKey(),
  name: text().notNull(),
});

export type Clinic = typeof clinic.$inferSelect;

export const clinicRelations = relations(clinic, ({ many }) => ({
  staff: many(staff),
}));
