import { z } from "zod";

export const SwitchClinicSchema = z.object({
  clinicId: z.number().int().positive().nullable(),
});

export type SwitchClinicSchema = z.infer<typeof SwitchClinicSchema>;
