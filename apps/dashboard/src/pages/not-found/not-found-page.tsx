import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-1">
        <p className="text-4xl font-semibold tracking-tight">404</p>
        <p className="font-medium">Page not found</p>
        <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      </div>
      <Button render={<Link to="/" />}>Go home</Button>
    </div>
  );
}
