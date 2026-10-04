"use client";
import { useMemo, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/finance/format";
import type { FinanceTransaction } from "@/lib/finance/types";
import { people } from "@/lib/finance/ledger-types";

export function InsightsView({ transactions, month }: { transactions: FinanceTransaction[]; month: string }) {
  const [person, setPerson] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(month);
  const months = [...new Set([month, ...transactions.map((item) => item.date.slice(0, 7))])].sort().reverse();
  const external = useMemo(() => transactions.filter((item) => !item.isTransfer && item.currency.toLowerCase() === "aud" && (person === "all" || person === item.person)), [transactions, person]);
  const current = external.filter((item) => item.date.startsWith(selectedMonth));
  const income = current.filter((item) => item.category === "Income" && item.status === "posted").reduce((sum, item) => sum + item.amount, 0);
  const categoryTotals = new Map<string, number>();
  for (const item of current.filter((item) => item.category !== "Income")) categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) - item.amount);
  const categoryRows = [...categoryTotals].sort((a, b) => b[1] - a[1]);
  const spending = categoryRows.reduce((sum, [, amount]) => sum + amount, 0);
  const maximum = Math.max(1, ...categoryRows.map(([, amount]) => amount));
  return <div><PageHeading eyebrow="Household patterns" title="Insights" description="Understand income, spending and person attribution across the history available to Harbour." />
    <div className="mb-4 grid gap-3 sm:grid-cols-2"><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger aria-label="Report month"><SelectValue /></SelectTrigger><SelectContent>{months.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Select value={person} onValueChange={setPerson}><SelectTrigger aria-label="Report person"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Whole household</SelectItem>{people.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid gap-4 sm:grid-cols-3">{[["Income", income], ["Spending", spending], ["Surplus", income - spending]].map(([label, amount]) => <Card key={label} className="shadow-xs"><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{formatMoney(Number(amount))}</p></CardContent></Card>)}</div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><Card className="shadow-xs"><CardHeader><CardTitle className="text-base">Spending by category</CardTitle></CardHeader><CardContent className="space-y-4">{categoryRows.length ? categoryRows.map(([category, amount]) => <div key={category}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{category}</span><span className="font-semibold">{formatMoney(amount)}</span></div><Progress value={Math.max(0, amount / maximum * 100)} className="h-2" /></div>) : <p className="text-sm text-muted-foreground">No external spending matches this selection.</p>}</CardContent></Card>
    <Card className="shadow-xs"><CardHeader><CardTitle className="text-base">Income versus spending</CardTitle><p className="text-xs text-muted-foreground">Months with imported activity; coverage may be partial.</p></CardHeader><CardContent className="space-y-4">{months.slice().reverse().map((value) => { const rows = external.filter((item) => item.date.startsWith(value)); const incoming = rows.filter((item) => item.category === "Income" && item.status === "posted").reduce((sum, item) => sum + item.amount, 0); const outgoing = -rows.filter((item) => item.category !== "Income").reduce((sum, item) => sum + item.amount, 0); return <div key={value} className="rounded-xl bg-secondary/50 p-4"><div className="flex justify-between gap-2 text-sm"><span className="font-medium">{value}</span><span className="font-semibold">{formatMoney(incoming - outgoing)}</span></div><div className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground"><span>In {formatMoney(incoming)}</span><span>Out {formatMoney(outgoing)}</span></div></div>; })}</CardContent></Card></div>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">Pending purchases are included. Transfers are excluded. Refunds reduce their category spend. Unknown and shared purchases remain in household totals.</p>
  </div>;
}
