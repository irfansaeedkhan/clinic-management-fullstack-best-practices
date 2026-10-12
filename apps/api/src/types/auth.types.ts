import type { auth } from "#src/lib/auth.ts";

export type Auth = typeof auth;

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
export type AuthSession = Session["session"];
