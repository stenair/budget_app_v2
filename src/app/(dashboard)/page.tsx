import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleAlert,
  CreditCard,
  Landmark,
  PiggyBank,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CategoryIcon } from "@/components/category-icon";
import { MiniChart } from "@/components/mini-chart";
import { RefreshButton } from "@/components/refresh-button";
import { formatDateTime, formatMoney, formatShortDate } from "@/lib/finance/format";
import { getFinanceSnapshot } from "@/lib/finance/redbark";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getFinanceSnapshot();
  const today = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Perth",
  }).format(new Date());
  const monthName = new Intl.DateTimeFormat("en-AU", {
    month: "long",
    timeZone: "Australia/Perth",
  }).format(new Date());
  const budgetPercent = data.metrics.overallBudget
    ? Math.round((data.metrics.overallBudgetSpent / data.metrics.overallBudget) * 100)
    : 0;
  const recent = data.transactions.filter((item) => !item.isTransfer).slice(0, 5);
  const remaining = data.metrics.overallBudget - data.metrics.overallBudgetSpent;
  const day = Number((data.month === "2026-10" && data.mode === "preview" ? "2026-10-04" : new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())).slice(-2));
  const upcoming = (data.recurring ?? []).filter((item) => item.amount < 0 && item.day > day).sort((a, b) => a.day - b.day).slice(0, 3);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Your household at a glance</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Here&apos;s where your household stands today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 gap-2 rounded-full bg-card px-3 font-normal">
            <span className={data.mode === "live" ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-amber-500"} />
            {data.mode === "live" ? "Live data" : "Preview data"}
          </Badge>
          <RefreshButton />
        </div>
      </div>

      {data.mode === "preview" ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <div>
            <span className="font-medium">Preview mode.</span> You&apos;re exploring a sample household. Your live connection can be configured in Settings.
          </div>
        </div>
      ) : null}
      {data.connection.status === "error" ? <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{data.connection.message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]" aria-label="Current position">
        <Card className="overflow-hidden border-primary/15 bg-primary text-primary-foreground shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-primary-foreground/70">Net liquid position</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                  {formatMoney(data.metrics.netLiquid)}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-primary-foreground/75">
                  <ArrowUpRight className="size-4" />
                  {formatMoney(data.metrics.savedThisMonth, { showSign: true })} this month
                </p>
              </div>
              {data.mode === "preview" ? <MiniChart values={[51, 53, 52, 57, 60, 62, 66]} color="#d8ebdf" /> : null}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-4">
                <div className="flex items-center gap-2 text-xs text-primary-foreground/65"><Wallet className="size-3.5" /> Offset balance</div>
                <p className="mt-2 text-lg font-semibold">{formatMoney(data.metrics.offsetBalance)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <div className="flex items-center gap-2 text-xs text-primary-foreground/65"><CreditCard className="size-3.5" /> Card owing</div>
                <p className="mt-2 text-lg font-semibold">{formatMoney(data.metrics.cardOwing)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{monthName} cash flow</CardTitle>
              <Badge variant="secondary" className="font-normal">{day} days in</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowDownRight className="size-3.5 text-emerald-600" /> Income</p>
                <p className="mt-1 text-xl font-semibold">{formatMoney(data.metrics.incomeThisMonth, { compact: true })}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowUpRight className="size-3.5 text-orange-600" /> Spending</p>
                <p className="mt-1 text-xl font-semibold">{formatMoney(data.metrics.spentThisMonth, { compact: true })}</p>
              </div>
            </div>
            <div className="rounded-xl bg-secondary/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Saved so far</span>
                <span className="text-sm font-semibold text-primary">{formatMoney(data.metrics.savedThisMonth)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Savings rate</span>
                <span>{data.metrics.savingsRate === null ? "—" : `${Math.round(data.metrics.savingsRate * 100)}%`}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Internal transfers and card repayments are excluded.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="At a glance">
        <MetricCard label="Income" value={formatMoney(data.metrics.incomeThisMonth, { compact: true })} detail="this month" icon={<ArrowDownRight />} tone="green" />
        <MetricCard label="Spent" value={formatMoney(data.metrics.spentThisMonth, { compact: true })} detail="this month" icon={<ArrowUpRight />} tone="orange" />
        <MetricCard label="Budget left" value={formatMoney(remaining, { compact: true })} detail={`${budgetPercent}% used`} icon={<PiggyBank />} tone="blue" />
        <MetricCard label="3-month outlook" value={data.forecastReady ? formatMoney(data.forecast[3]?.baseline ?? data.metrics.netLiquid, { compact: true }) : "Set plan"} detail="net liquid" icon={<Sparkles />} tone="purple" />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="shadow-xs">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Budget pulse</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{formatMoney(remaining)} remaining across tracked categories</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
              <Link href="/budgets">View all <ArrowRight className="size-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.budgets.slice(0, 4).map((budget) => {
              const used = budget.limit ? Math.round(((budget.spent + budget.pending) / budget.limit) * 100) : 0;
              return (
                <div key={budget.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <CategoryIcon name={budget.icon} color={budget.color} />
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{budget.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatMoney(budget.spent + budget.pending)} of {formatMoney(budget.limit)}</span>
                    </div>
                    <Progress value={Math.min(used, 100)} className="h-1.5" />
                  </div>
                  <span className="w-9 text-right text-xs font-medium">{used}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Latest household transactions</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
              <Link href="/activity">View all <ArrowRight className="size-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y px-5 pb-2">
            {recent.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <CategoryIcon name={categoryIcon(item.category)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.merchantName ?? item.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.category} · {formatShortDate(item.date)}</p>
                </div>
                <div className="text-right">
                  <p className={item.amount > 0 ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold"}>{formatMoney(item.amount)}</p>
                  {item.status === "pending" ? <span className="text-[10px] text-amber-700">Pending</span> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-xs lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {upcoming.map((item) => <Upcoming key={item.id} icon={item.category === "Mortgage" ? <Landmark /> : <CalendarClock />} date={`Day ${item.day}`} label={item.name} amount={formatMoney(-item.amount)} />)}
            {!upcoming.length ? <p className="text-sm text-muted-foreground">No remaining scheduled bills this month. <Link className="text-primary underline" href="/forecast">Manage schedule</Link></p> : null}
          </CardContent>
        </Card>
        <Card className="border-primary/15 bg-secondary/60 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" /> One useful insight</div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{data.forecastReady ? <>Your current monthly plan has a surplus of <span className="font-semibold text-foreground">{formatMoney(data.plannedSurplus ?? 0)}</span>. Compare it with your actual spending as the month progresses.</> : <>Add expected salaries and recurring bills in Forecast to see what your monthly budget could save.</>}</p>
          </CardContent>
        </Card>
      </section>

      <p className="mt-5 text-center text-[11px] text-muted-foreground">{data.connection.message} · Checked {formatDateTime(data.generatedAt)}</p>
    </div>
  );
}

function MetricCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: "green" | "orange" | "blue" | "purple" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <Card className="shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <span className={`mb-3 grid size-8 place-items-center rounded-lg [&>svg]:size-4 ${tones[tone]}`}>{icon}</span>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Upcoming({ icon, date, label, amount }: { icon: React.ReactNode; date: string; label: string; amount: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
      <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary [&>svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{date}</p><p className="truncate text-sm font-medium">{label}</p></div>
      <span className="text-xs font-semibold">{amount}</span>
    </div>
  );
}

function categoryIcon(category: string) {
  const mapping: Record<string, string> = {
    Groceries: "basket",
    "Eating out": "utensils",
    Transport: "car",
    Health: "health",
    Mortgage: "mortgage",
    Transfer: "transfer",
  };
  return mapping[category] ?? "other";
}
