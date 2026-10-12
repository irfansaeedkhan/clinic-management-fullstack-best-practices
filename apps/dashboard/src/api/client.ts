import ky from "ky";
import { env } from "@/config/env";

export const apiClient = ky.create({
  prefix: `${env.VITE_API_URL}/api`,
  credentials: "include",
});
