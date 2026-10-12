import { Navigate, Outlet, useSearchParams } from "react-router";
import { authClient } from "@/lib/auth-client";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { resolveLoginRedirect, RETURN_TO_PARAM_NAME } from "@/lib/resolve-login-redirect";

/**
 * Pages wrapped with this guard are only accessible when user is not authenticated
 */
export function PublicRoute() {
  const [searchParams] = useSearchParams();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <FullScreenLoader />;
  }

  if (session) {
    const redirectTo = resolveLoginRedirect(searchParams.get(RETURN_TO_PARAM_NAME));
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
