import { BudgetView } from "@/components/budget-view";
import { getFinanceSnapshot } from "@/lib/finance/redbark";

export const dynamic = "force-dynamic";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [data, filters] = await Promise.all([getFinanceSnapshot(), searchParams]);

  return <BudgetView initialBudgets={data.budgets} mode={data.mode} transactions={data.transactions} month={data.month ?? ""} categoryDefinitions={data.budgetCategories ?? []} initialCategory={filters.category} />;
}
