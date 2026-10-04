import { getFinanceSnapshot } from "@/lib/finance/redbark";
import { ActivityView } from "@/components/activity-view";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [data, params] = await Promise.all([getFinanceSnapshot(), searchParams]);
  const filters = Object.fromEntries(Object.entries(params).filter(([, value]) => typeof value === "string")) as Record<string, string>;
  return <ActivityView key={JSON.stringify(filters)} initialTransactions={data.transactions} mode={data.mode} month={data.month ?? ""} filters={filters} />;
}
