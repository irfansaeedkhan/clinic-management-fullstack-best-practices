import { Outlet } from "react-router";
import { StethoscopeIcon } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-sm space-y-1">
        <div className="space-y-1 flex flex-col items-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <StethoscopeIcon className="size-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Clinic Management System</h1>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
