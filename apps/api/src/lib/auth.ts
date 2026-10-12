import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "#src/db/index.ts";
import { env } from "#src/config/env.ts";
import { resolveActiveClinicIdOnLogin } from "#src/services/session.service.ts";
import { findUserStatusById } from "#src/services/user.service.ts";

export const auth = betterAuth({
  appName: env.APP_NAME,
  baseURL: env.API_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.DASHBOARD_URL],

  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    },
  },

  onAPIError: {
    errorURL: `${env.DASHBOARD_URL}/login`,
  },

  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: false,
      },
      platformRole: {
        type: ["super_user"],
        required: false,
        input: false,
      },
      status: {
        type: ["active", "inactive", "pending"],
        required: true,
        defaultValue: "pending",
        input: false,
      },
    },
  },

  session: {
    additionalFields: {
      activeClinicId: {
        type: "number",
        required: false,
        input: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          const email = userData.email.trim().toLowerCase();
          const promoteToSuperUser = env.SUPER_USER_EMAILS.includes(email);

          return {
            data: {
              ...userData,
              email,
              status: promoteToSuperUser ? "active" : "pending",
              ...(promoteToSuperUser ? { platformRole: "super_user" as const } : {}),
            },
          };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const userRecord = await findUserStatusById({ userId: Number(session.userId) });

          if (!userRecord) {
            throw new APIError("FORBIDDEN", {
              message: "User not found",
            });
          }

          switch (userRecord.status) {
            case "active":
              break;
            case "pending":
              throw new APIError("FORBIDDEN", {
                code: "pending",
                message: "Account pending approval",
              });
            case "inactive":
              throw new APIError("FORBIDDEN", {
                code: "inactive",
                message: "Account inactive",
              });
            default: {
              const _exhaustive: never = userRecord.status;
              throw _exhaustive;
            }
          }

          return { data: session };
        },
        after: async (session) => {
          await resolveActiveClinicIdOnLogin({
            sessionId: Number(session.id),
            userId: Number(session.userId),
          });
        },
      },
    },
  },

  advanced: {
    database: {
      generateId: "serial",
    },
  },
});
