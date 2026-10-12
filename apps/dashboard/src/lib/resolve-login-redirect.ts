export const RETURN_TO_PARAM_NAME = "returnTo";

export function resolveLoginRedirect(returnToParam: string | null): string {
  if (returnToParam?.startsWith("/") && !returnToParam.startsWith("//")) {
    return returnToParam;
  }
  return "/";
}
