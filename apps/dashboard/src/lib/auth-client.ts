import { createAuthClient } from "better-auth/react";
import { InferAuth } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { Auth } from "@repo/api/types";
import { env } from "@/config/env";

export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  fetchOptions: {
    credentials: "include",
  },
  $InferAuth: InferAuth<Auth>(),
  plugins: [inferAdditionalFields<Auth>()],
});
