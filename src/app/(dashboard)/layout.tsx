import { AppShell } from "@/components/app-shell";
import { AccessError, authConfigured, householdAccess } from "@/lib/finance/access";
import { HouseholdLogin } from "@/components/household-login";
import { getFinanceSnapshot } from "@/lib/finance/redbark";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try { await householdAccess(); } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    return <HouseholdLogin message={error.message} signIn={error.status === 401} canSignOut={error.status === 403 && authConfigured()} />;
  }
  const snapshot = await getFinanceSnapshot();
  return <AppShell mode={snapshot.mode} connectionStatus={snapshot.connection.status} authEnabled={authConfigured()}>{children}</AppShell>;
}
