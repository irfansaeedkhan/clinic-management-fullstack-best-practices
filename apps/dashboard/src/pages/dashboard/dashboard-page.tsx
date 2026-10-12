import { authClient } from "@/lib/auth-client";
import { PageHeaderSlot } from "@/components/page-header";
import { PageTitle } from "@/components/page-title";

export function DashboardPage() {
  const { data: session } = authClient.useSession();
  const name = session?.user?.name;

  return (
    <>
      <PageHeaderSlot>
        <PageTitle title="Dashboard" />
      </PageHeaderSlot>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Welcome{name ? `, ${name}` : ""}</h2>
          <p className="text-sm text-muted-foreground">You are signed in.</p>
        </div>
      </div>
    </>
  );
}
