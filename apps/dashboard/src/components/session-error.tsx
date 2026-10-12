import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type SessionErrorProps = {
  onRetry: () => void;
};

/**
 * Shown when the session request fails for an unexpected reason
 * (network/server error) rather than the user being unauthenticated.
 * Retrying refetches the session instead of bouncing to the login page.
 */
export function SessionError({ onRetry }: SessionErrorProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlertIcon className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">Unable to verify your session</p>
        <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
      </div>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}
