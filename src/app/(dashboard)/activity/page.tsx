import { getFinanceSnapshot } from "@/lib/finance/redbark";
import { ActivityView } from "@/components/activity-view";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const data = await getFinanceSnapshot();
  return <ActivityView initialTransactions={data.transactions} mode={data.mode} />;
}
