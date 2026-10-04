import { ForecastView } from "@/components/forecast-view";
import { getFinanceSnapshot } from "@/lib/finance/redbark";
import { PlannedEvents } from "@/components/planned-events";
import { RecurringEditor } from "@/components/recurring-editor";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const data = await getFinanceSnapshot();

  return <><ForecastView points={data.forecast} monthlySurplus={data.plannedSurplus ?? 0} ready={data.forecastReady ?? false} transactions={data.transactions} month={data.month ?? ""} plannedIncome={data.plannedIncome ?? 0} plannedSpending={data.plannedSpending ?? 0} expensePlan={data.expensePlan ?? []} events={data.plannedEvents ?? []} asOf={data.reportDate ?? ""} /><PlannedEvents events={data.plannedEvents ?? []} asOf={data.reportDate ?? ""} /><RecurringEditor items={data.recurring ?? []} /></>;
}
