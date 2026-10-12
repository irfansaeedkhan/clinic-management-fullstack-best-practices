import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BuildingIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton } from "@/components/ui/sidebar";
import { listUserClinicsQueryOptions } from "@/queries/clinic";
import { switchClinicMutationOptions } from "@/queries/session";
import { handleApiError } from "@/lib/utils";

export function ClinicSwitcher() {
  const { data, isLoading } = useQuery(listUserClinicsQueryOptions());
  const switchClinic = useMutation(switchClinicMutationOptions());

  const clinics = data?.data?.clinics ?? [];
  const activeClinic = clinics.find((c) => c.isActive);

  async function handleSelect(clinicId: number, isActive: boolean) {
    if (isActive || switchClinic.isPending) return;
    try {
      await switchClinic.mutateAsync({ clinicId });
    } catch (error) {
      toast.error(await handleApiError(error, "Unable to switch clinic"));
    }
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      </SidebarMenu>
    );
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
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <BuildingIcon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeClinic?.name ?? "Select clinic"}</span>
              <span className="truncate text-xs text-muted-foreground">
                {activeClinic ? activeClinic.roles.join(", ") || "No role" : "No clinic selected"}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--anchor-width) min-w-56" align="start" side="bottom" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Clinics</DropdownMenuLabel>
              {clinics.length === 0 ? (
                <DropdownMenuItem disabled>No clinics available</DropdownMenuItem>
              ) : (
                clinics.map((clinic) => (
                  <DropdownMenuItem
                    key={clinic.id}
                    disabled={switchClinic.isPending}
                    onClick={() => handleSelect(clinic.id, clinic.isActive)}
                  >
                    <BuildingIcon className="size-4" />
                    <span className="flex-1 truncate">{clinic.name}</span>
                    {clinic.isActive ? <CheckIcon className="size-4" /> : null}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
