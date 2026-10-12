import { z } from "zod";

export const UserStatusSchema = z.enum(["active", "inactive", "pending"]);
export type UserStatusSchema = z.infer<typeof UserStatusSchema>;

export const UpdateUserStatusSchema = z.object({
  status: UserStatusSchema,
});

export const UserIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});
