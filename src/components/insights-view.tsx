"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import { activityLink, monthlyHistory, monthLabel } from "@/lib/finance/history";
import type { FinanceTransaction } from "@/lib/finance/types";
import { people } from "@/lib/finance/ledger-types";
import { useHousehold } from "@/components/household-context";
import { MonthlyChart } from "@/components/monthly-chart";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function InsightsView({ transactions, month }: { transactions: FinanceTransaction[]; month: string }) {
  const { personLabel } = useHousehold();
  const [person, setPerson] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [detail, setDetail] = useState<{ title: string; category?: string; flow?: string; merchant?: string } | null>(null);
  const history = useMemo(() => monthlyHistory(transactions, month, person), [transactions, month, person]);
  const external = transactions.filter((item) => !item.isTransfer && item.currency.toLowerCase() === "aud" && item.status === "posted" && (person === "all" || person === item.person));
  const current = external.filter((item) => item.date.startsWith(selectedMonth));
  const summary = history.find((row) => row.month === selectedMonth);
  const income = summary?.income ?? 0;
  const spending = summary?.spending ?? 0;
  const categoryTotals = new Map<string, number>();
  const merchants = new Map<string, number>();
  for (const item of current.filter((item) => item.category !== "Income")) {
    categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) - item.amount);
    const merchant = item.merchantName ?? item.description;
    merchants.set(merchant, (merchants.get(merchant) ?? 0) - item.amount);
  }
  const categoryRows = [...categoryTotals].sort((a, b) => b[1] - a[1]);
  const maximum = Math.max(1, ...categoryRows.map(([, amount]) => amount));
  const detailRows = current.filter((item) => (!detail?.category || item.category === detail.category) && (!detail?.flow || (detail.flow === "income" ? item.category === "Income" : item.category !== "Income")) && (!detail?.merchant || (item.merchantName ?? item.description) === detail.merchant));
  const detailLink = activityLink({ month: selectedMonth, person, status: "posted", flow: detail?.flow ?? "external", category: detail?.category ?? "all", merchant: detail?.merchant ?? "" });
  const pending = -transactions.filter((item) => item.date.startsWith(selectedMonth) && !item.isTransfer && item.status === "pending" && item.amount < 0 && (person === "all" || person === item.person)).reduce((sum, item) => sum + item.amount, 0);
  return <div>
    <PageHeading eyebrow="Household patterns" title="Insights" description="Follow monthly trends, find the drivers of spending and open the transactions behind any total." />
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <Select value={selectedMonth} onValueChange={(value) => { setSelectedMonth(value); setDetail(null); }}><SelectTrigger aria-label="Report month"><SelectValue /></SelectTrigger><SelectContent>{history.toReversed().map((row) => <SelectItem key={row.month} value={row.month}>{monthLabel(row.month)}{row.current ? " · to date" : ""}</SelectItem>)}</SelectContent></Select>
      <Select value={person} onValueChange={(value) => { setPerson(value); setDetail(null); }}><SelectTrigger aria-label="Report person"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Whole household</SelectItem>{people.map((value) => <SelectItem key={value} value={value}>{personLabel(value)}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">{[{ label: "Income", amount: income, flow: "income" }, { label: "Expenses", amount: spending, flow: "spending" }, { label: "Surplus", amount: income - spending, flow: undefined }].map((metric) => <button key={metric.label} className="rounded-xl text-left focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setDetail({ title: metric.label, flow: metric.flow })}><Card className="h-full shadow-xs transition-colors hover:bg-secondary"><CardContent className="p-5"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-1 text-2xl font-semibold">{formatMoney(metric.amount)}</p><p className="mt-2 text-xs text-primary">View transactions →</p></CardContent></Card></button>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">Posted transactions only · {pending ? `${formatMoney(pending)} pending purchases excluded · ` : ""}{summary?.current ? "Current month is still in progress." : "Imported history may cover only part of a month."}</p>
    <Sheet open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{detail?.title} · {monthLabel(selectedMonth)}</SheetTitle><SheetDescription>{detailRows.length} posted transactions · {person === "all" ? "Whole household" : personLabel(person)}</SheetDescription></SheetHeader><div className="px-4 pb-8"><div className="divide-y">{detailRows.slice(0, 12).map((item) => <div key={item.id} className="flex justify-between gap-4 py-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{item.merchantName ?? item.description}</p><p className="text-xs text-muted-foreground">{formatShortDate(item.date)} · {item.category} · {personLabel(item.person)}</p></div><span className="shrink-0 font-semibold">{formatMoney(item.amount)}</span></div>)}</div>{!detailRows.length ? <p className="py-4 text-sm text-muted-foreground">No matching posted transactions.</p> : null}<Button asChild variant="outline" className="mt-3 h-auto whitespace-normal py-3 text-center"><Link href={detailLink}>Open all matching transactions in Activity</Link></Button></div></SheetContent></Sheet>
    <Card className="mt-4 shadow-xs"><CardHeader><CardTitle className="text-base">Income, expenses and monthly surplus</CardTitle><p className="text-xs text-muted-foreground">Click a month to explore it. The amount below each month is its surplus.</p></CardHeader><CardContent><MonthlyChart rows={history} onSelect={(value) => { setSelectedMonth(value); setDetail({ title: "Monthly movements" }); }} /></CardContent></Card>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card className="shadow-xs"><CardHeader><CardTitle className="text-base">What drove expenses?</CardTitle><p className="text-xs text-muted-foreground">Select a category to drill into its purchases and refunds.</p></CardHeader><CardContent className="space-y-2">{categoryRows.length ? categoryRows.map(([category, amount]) => <button key={category} className="w-full rounded-lg p-2 text-left hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setDetail({ title: category, category })}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{category}</span><span className="font-semibold">{formatMoney(amount)} →</span></div><Progress value={Math.max(0, amount / maximum * 100)} className="h-2" /></button>) : <p className="text-sm text-muted-foreground">No expenses match this selection.</p>}</CardContent></Card>
      <Card className="shadow-xs"><CardHeader><CardTitle className="text-base">Largest merchants</CardTitle><p className="text-xs text-muted-foreground">Net expenses after refunds.</p></CardHeader><CardContent className="space-y-2">{[...merchants].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([merchant, amount]) => <button key={merchant} className="flex w-full justify-between gap-3 rounded-lg p-3 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setDetail({ title: merchant, merchant, flow: "spending" })}><span className="min-w-0 truncate">{merchant}</span><span className="shrink-0 font-semibold">{formatMoney(amount)} →</span></button>)}{!merchants.size ? <p className="text-sm text-muted-foreground">No merchant spending in this month.</p> : null}</CardContent></Card>
    </div>
    <Card className="mt-4 shadow-xs"><CardHeader><CardTitle className="text-base">Monthly comparison</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-xs sm:text-sm"><thead><tr className="border-b text-muted-foreground"><th className="py-3">Month</th><th className="px-2 text-right">Income</th><th className="px-2 text-right">Expenses</th><th className="text-right">Surplus</th></tr></thead><tbody>{history.map((row) => <tr key={row.month} className="border-b"><td className="py-3"><Link className="font-medium text-primary underline-offset-4 hover:underline" href={activityLink({ month: row.month, person, status: "posted", flow: "external" })}>{monthLabel(row.month)}{row.current ? "*" : ""}</Link></td><td className="px-2 text-right">{formatMoney(row.income)}</td><td className="px-2 text-right">{formatMoney(row.spending)}</td><td className="text-right">{formatMoney(row.surplus)}</td></tr>)}</tbody></table></div></CardContent></Card>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">Transfers are excluded. Refunds reduce expenses. Person attribution is your classification, not a bank-confirmed cardholder identity. * Month to date.</p>
  </div>;
}
