import { clsx, type ClassValue } from "clsx";
import { HTTPError } from "ky";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function readMessage(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return undefined;
  }

  const message = value.message;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }

  return undefined;
}

export async function handleApiError(error: unknown, fallbackMessage = "An unknown error occurred"): Promise<string> {
  if (error instanceof HTTPError) {
    try {
      const body: unknown = await error.response.clone().json();
      const message = readMessage(body);
      if (message) {
        return message;
      }
    } catch {
      // The response body was not JSON. Fall through to the error message.
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return readMessage(error) ?? fallbackMessage;
}
