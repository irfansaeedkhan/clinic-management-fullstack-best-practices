import { useCallback, useState } from "react";
import { Outlet } from "react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar/app-sidebar";
import { PageHeaderProvider } from "../page-header";

/**
 * Authenticated app shell.
 */
export function AppLayout() {
  const [pageHeaderContainer, setPageHeaderContainer] = useState<HTMLDivElement | null>(null);

  const handlePageHeaderContainerRef = useCallback((element: HTMLDivElement | null) => {
    setPageHeaderContainer(element);
  }, []);

  return (
    <PageHeaderProvider container={pageHeaderContainer}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div ref={handlePageHeaderContainerRef} className="min-w-0 flex-1" />
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </PageHeaderProvider>
  );
}
