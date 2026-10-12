import { z } from "zod";
import { StaffRoleQuerySchema, StaffRoleSchema } from "./staff-role.ts";

export const StaffStatusSchema = z.enum(["active", "inactive"]);
export type StaffStatusSchema = z.infer<typeof StaffStatusSchema>;

export const CreateStaffSchema = z.object({
  userId: z.number().int().positive(),
  clinicId: z.number().int().positive(),
});
export type CreateStaffSchema = z.infer<typeof CreateStaffSchema>;

export const UpdateStaffRolesSchema = z.object({
  roles: z.array(StaffRoleSchema),
});
export type UpdateStaffRolesSchema = z.infer<typeof UpdateStaffRolesSchema>;

export const UpdateStaffStatusSchema = z.object({
  status: StaffStatusSchema,
});
export type UpdateStaffStatusSchema = z.infer<typeof UpdateStaffStatusSchema>;

export const StaffIdParamSchema = z.object({
  staffId: z.coerce.number().int().positive(),
});

export const ListStaffQuerySchema = z.object({
  status: z.union([StaffStatusSchema, z.literal("all")]).optional(),
  role: StaffRoleQuerySchema,
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(["name", "createdAt"]).optional().default("name"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
});
export type ListStaffQuerySchema = z.infer<typeof ListStaffQuerySchema>;
