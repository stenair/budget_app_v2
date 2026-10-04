"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarRange, Landmark, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { PageHeading } from "@/components/page-heading";
import { formatMoney } from "@/lib/finance/format";
import type { ForecastPoint, FinanceTransaction, FinanceSnapshot } from "@/lib/finance/types";
import { monthlyHistory, monthLabel } from "@/lib/finance/history";
import { MonthlyChart } from "@/components/monthly-chart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ForecastChart } from "./forecast-chart";

export function ForecastView({ points, monthlySurplus, ready, transactions, month, plannedIncome, plannedSpending, expensePlan }: { points: ForecastPoint[]; monthlySurplus: number; ready: boolean; transactions: FinanceTransaction[]; month: string; plannedIncome: number; plannedSpending: number; expensePlan: NonNullable<FinanceSnapshot["expensePlan"]> }) {
  const [months, setMonths] = useState(12);
  const [incomeInput, setIncomeInput] = useState(String(plannedIncome / 100));
  const [expenseInput, setExpenseInput] = useState(String(plannedSpending / 100));
  const [override, setOverride] = useState<{ income: number; spending: number } | null>(null);
  const history = monthlyHistory(transactions, month);
  const past = history.filter((row) => !row.current && row.count > 0);
  const averageIncome = past.length ? Math.round(past.reduce((sum, row) => sum + row.income, 0) / past.length) : null;
  const averageSpending = past.length ? Math.round(past.reduce((sum, row) => sum + row.spending, 0) / past.length) : null;
  const surplus = override ? override.income - override.spending : monthlySurplus;
  const enabled = override ? override.income > 0 : ready;
  const [spendingChange, setSpendingChange] = useState(0);
  const [extraMortgage, setExtraMortgage] = useState(0);
  const adjusted = useMemo(
    () => Array.from({ length: months + 1 }, (_, index) => {
      const [year, number] = month.split("-").map(Number);
      const date = new Date(Date.UTC(year, number - 1 + index, 1)).toISOString().slice(0, 7);
      const baseline = (points[0]?.baseline ?? 0) + (enabled ? surplus * index : 0);
      return { month: date, label: monthLabel(date), baseline, value: baseline - index * (spendingChange + extraMortgage) * 100 };
    }),
    [extraMortgage, points, spendingChange, months, month, surplus, enabled],
  );
  const endValue = adjusted.at(-1)?.value ?? 0;
  const baselineEnd = adjusted.at(-1)?.baseline ?? 0;
  const difference = endValue - baselineEnd;

  return (
    <div>
      <PageHeading
        eyebrow="Forward view"
        title="Forecast"
        description="Use actual monthly history to inform your plan, then explore income, expenses and extra mortgage payments."
        action={<select className="h-10 rounded-lg border bg-card px-3 text-sm" aria-label="Forecast horizon" value={months} onChange={(event) => setMonths(Number(event.target.value))}>{[3, 6, 12, 24, 36].map((value) => <option key={value} value={value}>{value} months</option>)}</select>}
      />
      <Card className="mb-4 shadow-xs"><CardHeader><CardTitle className="text-base">Your history as a planning guide</CardTitle><p className="text-xs text-muted-foreground">Past imported monthly averages: income {averageIncome === null ? "unavailable" : formatMoney(averageIncome)} · expenses {averageSpending === null ? "unavailable" : formatMoney(averageSpending)}. Current month excluded.</p></CardHeader><CardContent><MonthlyChart rows={history} /><p className="mt-3 text-xs leading-5 text-muted-foreground">Imported months may be incomplete. Irregular income or one-off purchases can distort these averages. Review <Link className="text-primary underline" href="/insights">Insights and its underlying transactions</Link> before using them.</p>{averageIncome !== null && averageSpending !== null ? <Button className="mt-3" variant="outline" size="sm" onClick={() => { setIncomeInput(String(averageIncome / 100)); setExpenseInput(String(Math.max(0, averageSpending) / 100)); setOverride({ income: averageIncome, spending: Math.max(0, averageSpending) }); }}>Try historical averages in this scenario</Button> : null}</CardContent></Card>
      {!enabled ? <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Add expected income to the schedule below, or enter a scenario income. Without income, the baseline holds the starting balance constant.</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
        <Card className="shadow-xs">
          <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle className="text-base">Net liquid projection</CardTitle><p className="mt-1 text-xs text-muted-foreground">Offset balance less credit card owing</p></div>
            <div className="text-left sm:text-right"><p className="text-xs text-muted-foreground">In {months} months</p><p className="mt-1 text-2xl font-semibold">{formatMoney(endValue)}</p></div>
          </CardHeader>
          <CardContent>
            <ForecastChart points={adjusted} comparison={spendingChange !== 0 || extraMortgage !== 0} />
            <div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>{adjusted[0]?.label}</span><span>{adjusted.at(-1)?.label}</span></div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader><CardTitle className="text-base">Scenario controls</CardTitle><p className="text-xs text-muted-foreground">Amounts apply every month.</p></CardHeader>
          <CardContent className="space-y-7">
            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); setOverride({ income: Math.round(Number(incomeInput) * 100), spending: Math.round(Number(expenseInput) * 100) }); }}>
              <label className="block text-xs font-medium">Expected monthly income ($)<Input className="mt-1" type="number" min={0} max={1000000} step="0.01" required value={incomeInput} onChange={(event) => setIncomeInput(event.target.value)} /></label>
              <label className="block text-xs font-medium">Expected monthly expenses ($)<Input className="mt-1" type="number" min={0} max={1000000} step="0.01" required value={expenseInput} onChange={(event) => setExpenseInput(event.target.value)} /></label>
              <div className="flex flex-wrap gap-2"><Button size="sm" type="submit">Apply scenario</Button><Button size="sm" variant="ghost" type="button" onClick={() => { setOverride(null); setIncomeInput(String(plannedIncome / 100)); setExpenseInput(String(plannedSpending / 100)); }}>Use saved plan</Button></div>
              <p className="text-[11px] leading-5 text-muted-foreground">{override ? "Using temporary scenario inputs." : "Using your saved recurring income, bills and budgets."} Scenario inputs are not saved; update the schedule or budgets below for your ongoing plan.</p>
              <details className="rounded-lg border p-3"><summary className="cursor-pointer text-xs font-medium">Where saved expenses come from: {formatMoney(plannedSpending)}</summary><p className="mt-2 text-xs leading-5 text-muted-foreground">For each category, Harbour uses the larger of its budget target and monthly recurring bills. The total includes category budgets even when no bill is scheduled. Change these targets in Budgets.</p><div className="mt-3 space-y-2">{expensePlan.filter((item) => item.total > 0).map((item) => <div key={item.category} className="flex justify-between gap-3 text-xs"><div><p className="font-medium">{item.category}</p><p className="text-muted-foreground">Budget {formatMoney(item.budget)} · bills {formatMoney(item.recurring)}</p></div><span className="shrink-0 font-semibold">{formatMoney(item.total)}</span></div>)}</div><Link href="/budgets" className="mt-3 inline-block text-xs text-primary underline">Review budget targets</Link></details>
            </form>
            <ScenarioSlider label="Extra household spending" value={spendingChange} min={-1000} max={2000} step={50} onChange={setSpendingChange} helper="Use a negative amount for monthly savings." />
            <ScenarioSlider label="Extra mortgage payment" value={extraMortgage} min={0} max={3000} step={100} onChange={setExtraMortgage} helper="Reduces liquid funds in this forecast." />
            <div className="rounded-xl bg-secondary/70 p-4">
              <p className="text-xs text-muted-foreground">Impact after {months} months</p>
              <p className={difference >= 0 ? "mt-1 text-xl font-semibold text-emerald-700" : "mt-1 text-xl font-semibold text-orange-700"}>{formatMoney(difference, { showSign: true })}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Compared with the current spending pattern.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <ForecastStat icon={<ArrowUpRight />} label={override ? "Scenario monthly surplus" : "Planned monthly surplus"} value={enabled ? formatMoney(surplus) : "Set income first"} />
        <ForecastStat icon={<CalendarRange />} label="Scenario monthly change" value={formatMoney(-(spendingChange + extraMortgage) * 100, { showSign: true })} />
        <ForecastStat icon={<Landmark />} label={`Baseline in ${months} months`} value={formatMoney(baselineEnd)} />
      </section>

      <Card className="mt-4 border-primary/15 bg-secondary/60 shadow-xs">
        <CardContent className="flex items-start gap-3 p-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-background text-primary"><Sparkles className="size-4" /></span>
          <div><p className="text-sm font-semibold">Planning note</p><p className="mt-1 text-sm leading-6 text-muted-foreground">The baseline uses your monthly salary schedule, regular bills and category budgets. It projects net liquid funds, with interest, tax changes and irregular annual bills excluded. Card repayments move funds between your accounts and do not reduce net liquid funds again.</p></div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScenarioSlider({ label, value, min, max, step, onChange, helper }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; helper: string }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3"><label className="text-sm font-medium">{label}</label><span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">{value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("en-AU")}</span></div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(next[0] ?? 0)} aria-label={label} />
      <p className="mt-2 text-[11px] text-muted-foreground">{helper}</p>
    </div>
  );
}

function ForecastStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <Card className="shadow-xs"><CardContent className="flex items-center gap-3 p-4"><span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary [&>svg]:size-4">{icon}</span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-lg font-semibold">{value}</p></div></CardContent></Card>;
}
