import { useState } from "react";
import { useSearchParams } from "react-router";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { handleApiError } from "@/lib/utils";
import { resolveLoginRedirect, RETURN_TO_PARAM_NAME } from "@/lib/resolve-login-redirect";
import { Button } from "@/components/ui/button";
import { LoginReasonBanner } from "./_components/login-reason-banner";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const error = searchParams.get("error");

  async function handleGoogleSignIn() {
    setIsSigningIn(true);

    const redirectTo = resolveLoginRedirect(searchParams.get(RETURN_TO_PARAM_NAME));

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: new URL(redirectTo, window.location.origin).toString(),
    });

    if (error) {
      toast.error(await handleApiError(error, "Unable to sign in with Google"));
      setIsSigningIn(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">Use your Google account to sign in to your clinic.</p>

      <Button type="button" size="lg" className="w-full" disabled={isSigningIn} onClick={handleGoogleSignIn}>
        {isSigningIn ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Continue with Google
      </Button>

      <LoginReasonBanner reason={error} />
    </div>
  );
}
