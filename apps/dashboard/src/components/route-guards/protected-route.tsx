import { Navigate, Outlet, useLocation } from "react-router";
import { authClient } from "@/lib/auth-client";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { SessionError } from "@/components/session-error";
import { RETURN_TO_PARAM_NAME } from "@/lib/resolve-login-redirect";

export function ProtectedRoute() {
  const location = useLocation();
  const { data: session, isPending, error, refetch } = authClient.useSession();

  if (isPending) {
    return <FullScreenLoader />;
  }

  // A failed session request (network/server error) is not the same as being
  // unauthenticated. Better Auth returns `null` data when signed out, so reaching
  // `isError` means the request itself failed — let the user retry instead of
  // redirecting them to login.
  if (error) {
    return <SessionError onRetry={refetch} />;
  }

  if (!session) {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={{ pathname: "/login", search: `?${RETURN_TO_PARAM_NAME}=${encodeURIComponent(returnPath)}` }}
        replace
      />
    );
  }

  return <Outlet />;
}
