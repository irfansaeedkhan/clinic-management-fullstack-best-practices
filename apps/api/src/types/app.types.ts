import type { HttpBindings } from "@hono/node-server";
import type { Env as HonoPinoEnv } from "hono-pino";
import type { StaffRoleName } from "@repo/shared-lib/staff-roles";
import type { AuthSession, User } from "./auth.types.ts";

export type AppVariables = {
  user: User | null;
  session: AuthSession | null;
  activeClinicId: number | null;
  staffRoles: StaffRoleName[];
  isSuperUser: boolean;
};

export interface HonoAppEnv {
  Bindings: HttpBindings;
  Variables: AppVariables & HonoPinoEnv["Variables"];
}
