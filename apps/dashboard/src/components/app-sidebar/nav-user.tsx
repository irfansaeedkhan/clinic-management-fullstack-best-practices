import { toast } from "sonner";
import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { handleApiError } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function NavUser() {
  const { data: session } = authClient.useSession();

  const user = session?.user;
  const initials = getInitials(user?.name, user?.email);

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(await handleApiError(error, "Unable to sign out"));
      return;
    }
    window.location.href = "/login";
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={user?.image ?? undefined} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.name ?? "User"}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--anchor-width) min-w-56" align="end" side="top" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="grid text-left text-sm leading-tight">
                  <span className="truncate font-medium text-foreground">{user?.name ?? "User"}</span>
                  <span className="truncate text-xs font-normal">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <SettingsIcon className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOutIcon className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
