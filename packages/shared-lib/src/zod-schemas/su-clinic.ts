import { z } from "zod";

export const CreateClinicSchema = z.object({
  name: z.string().trim().min(1),
});
