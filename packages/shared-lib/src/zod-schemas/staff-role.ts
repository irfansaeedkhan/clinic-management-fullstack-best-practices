import z from "zod";
import { staffRoleNamesArray } from "../staff-roles.ts";

export const StaffRoleSchema = z.enum(staffRoleNamesArray);

export const StaffRoleQuerySchema = z
  .union([StaffRoleSchema, z.array(StaffRoleSchema)])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return Array.isArray(value) ? value : [value];
  });
