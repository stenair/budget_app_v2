"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarRange, Landmark, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { PageHeading } from "@/components/page-heading";
import { formatMoney } from "@/lib/finance/format";
import type { ForecastPoint } from "@/lib/finance/types";

export function ForecastView({ points, monthlySurplus, ready }: { points: ForecastPoint[]; monthlySurplus: number; ready: boolean }) {
  const [spendingChange, setSpendingChange] = useState(0);
  const [extraMortgage, setExtraMortgage] = useState(0);
  const adjusted = useMemo(
    () => points.map((point, index) => ({ ...point, value: point.baseline - index * (spendingChange + extraMortgage) * 100 })),
    [extraMortgage, points, spendingChange],
  );
  const endValue = adjusted.at(-1)?.value ?? 0;
  const baselineEnd = points.at(-1)?.baseline ?? 0;
  const difference = endValue - baselineEnd;

  return (
    <div>
      <PageHeading
        eyebrow="Forward view"
        title="Forecast"
        description="Explore how recurring spending and extra mortgage payments could change your liquid position over the next year."
        action={<Badge variant="outline" className="w-fit rounded-full bg-card px-3 py-1.5 font-normal">12 month view</Badge>}
      />
      {!ready ? <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Add expected salary income below to enable the baseline forecast. The chart currently holds the starting balance constant.</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
        <Card className="shadow-xs">
          <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle className="text-base">Net liquid projection</CardTitle><p className="mt-1 text-xs text-muted-foreground">Offset balance less credit card owing</p></div>
            <div className="text-left sm:text-right"><p className="text-xs text-muted-foreground">In 12 months</p><p className="mt-1 text-2xl font-semibold">{formatMoney(endValue)}</p></div>
          </CardHeader>
          <CardContent>
            <ForecastChart points={adjusted} />
            <div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>{adjusted[0]?.label}</span><span>{adjusted.at(-1)?.label}</span></div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader><CardTitle className="text-base">Scenario controls</CardTitle><p className="text-xs text-muted-foreground">Amounts apply every month.</p></CardHeader>
          <CardContent className="space-y-7">
            <ScenarioSlider label="Extra household spending" value={spendingChange} min={-1000} max={2000} step={50} onChange={setSpendingChange} helper="Use a negative amount for monthly savings." />
            <ScenarioSlider label="Extra mortgage payment" value={extraMortgage} min={0} max={3000} step={100} onChange={setExtraMortgage} helper="Reduces liquid funds in this forecast." />
            <div className="rounded-xl bg-secondary/70 p-4">
              <p className="text-xs text-muted-foreground">Impact after 12 months</p>
              <p className={difference >= 0 ? "mt-1 text-xl font-semibold text-emerald-700" : "mt-1 text-xl font-semibold text-orange-700"}>{formatMoney(difference, { showSign: true })}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Compared with the current spending pattern.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <ForecastStat icon={<ArrowUpRight />} label="Planned monthly surplus" value={ready ? formatMoney(monthlySurplus) : "Set income first"} />
        <ForecastStat icon={<CalendarRange />} label="Scenario monthly change" value={formatMoney(-(spendingChange + extraMortgage) * 100, { showSign: true })} />
        <ForecastStat icon={<Landmark />} label="Baseline in 12 months" value={formatMoney(baselineEnd)} />
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

function ForecastChart({ points }: { points: Array<ForecastPoint & { value: number }> }) {
  const width = 760;
  const height = 260;
  const pad = 12;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const coords = points.map((point, index) => ({ x: pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2), y: height - pad - ((point.value - min) / range) * (height - pad * 2) }));
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${coords.at(-1)?.x ?? width - pad},${height - pad} L${coords[0]?.x ?? pad},${height - pad} Z`;
  return (
    <div className="overflow-hidden rounded-xl bg-secondary/45 px-2 py-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" role="img" aria-label="Twelve month net liquid forecast">
        <defs><linearGradient id="forecast-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.24" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((fraction) => <line key={fraction} x1={pad} x2={width - pad} y1={height * fraction} y2={height * fraction} stroke="var(--border)" strokeDasharray="4 6" />)}
        <path d={area} fill="url(#forecast-fill)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coords.filter((_, index) => index === 0 || index === coords.length - 1).map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="3" />)}
      </svg>
    </div>
  );
}

function ForecastStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <Card className="shadow-xs"><CardContent className="flex items-center gap-3 p-4"><span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary [&>svg]:size-4">{icon}</span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-lg font-semibold">{value}</p></div></CardContent></Card>;
}
