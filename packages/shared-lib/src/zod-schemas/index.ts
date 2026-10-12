export { CreateClinicSchema } from "./su-clinic.ts";
export { UpdateUserStatusSchema, UserIdParamSchema, UserStatusSchema } from "./su-user.ts";
export { SwitchClinicSchema } from "./session.ts";
export {
  CreateStaffSchema,
  ListStaffQuerySchema,
  StaffIdParamSchema,
  StaffStatusSchema,
  UpdateStaffRolesSchema,
  UpdateStaffStatusSchema,
} from "./staff.ts";

import z from "zod";

export const AppEnvSchema = z.enum(["development", "staging", "production"]).default("production");
