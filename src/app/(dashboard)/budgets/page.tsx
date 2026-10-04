import { BudgetView } from "@/components/budget-view";
import { getFinanceSnapshot } from "@/lib/finance/redbark";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const data = await getFinanceSnapshot();

  return <BudgetView initialBudgets={data.budgets} mode={data.mode} transactions={data.transactions} month={data.month ?? ""} />;
}
