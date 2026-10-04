import { InsightsView } from "@/components/insights-view";
import { getFinanceSnapshot } from "@/lib/finance/redbark";

export const dynamic = "force-dynamic";
export default async function InsightsPage() {
  const snapshot = await getFinanceSnapshot();
  return <InsightsView transactions={snapshot.transactions} asOf={snapshot.reportDate ?? ""} budgets={snapshot.budgets} month={snapshot.month ?? ""} />;
}
