import { ForecastView } from "@/components/forecast-view";
import { getFinanceSnapshot } from "@/lib/finance/redbark";
import { RecurringEditor } from "@/components/recurring-editor";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const data = await getFinanceSnapshot();

  return <><ForecastView points={data.forecast} monthlySurplus={data.plannedSurplus ?? 0} ready={data.forecastReady ?? false} /><RecurringEditor items={data.recurring ?? []} /></>;
}
