"use client";

import { useState } from "react";
import { CircleDollarSign, Pencil, PiggyBank, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeading } from "@/components/page-heading";
import { formatMoney } from "@/lib/finance/format";
import type { BudgetLine, FinanceTransaction } from "@/lib/finance/types";
import { useLedgerSave } from "@/components/use-ledger-save";
import Link from "next/link";
import { useHousehold } from "@/components/household-context";
import { activityLink, expenseContribution, monthlyHistory, monthLabel } from "@/lib/finance/history";

export function BudgetView({ initialBudgets, mode, transactions, month, categoryDefinitions }: { initialBudgets: BudgetLine[]; mode: "preview" | "live"; transactions: FinanceTransaction[]; month: string; categoryDefinitions: Array<{ id: string; name: string; hidden: boolean }> }) {
  const { names } = useHousehold();
  const { save, pending, message, error } = useLedgerSave();
  const [editing, setEditing] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [manage, setManage] = useState(false);
  const [historyCategory, setHistoryCategory] = useState("Groceries");
  const [historyOpen, setHistoryOpen] = useState(false);

  const budgets = initialBudgets;
  const totalLimit = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalUsed = budgets.reduce((sum, budget) => sum + budget.spent + budget.pending, 0);
  const remaining = totalLimit - totalUsed;
  const usedPercent = totalLimit ? Math.round((totalUsed / totalLimit) * 100) : 0;

  function saveLimit(budget: BudgetLine, dollars: number, stefanShare: string) {
    const allocation = stefanShare === "" ? null : { stefan: Number(stefanShare), partner: 100 - Number(stefanShare) };
    save({ kind: "budget", id: budget.id, value: { limit: Math.max(0, Math.round(dollars * 100)), allocation } }, () => setEditing(null));
  }

  return (
    <div>
      <PageHeading
        eyebrow="Monthly plan"
        title="Budgets"
        description="Set practical limits for flexible household spending and see pending card purchases before they settle."
        action={<Badge variant="outline" className="w-fit rounded-full bg-card px-3 py-1.5 font-normal">Monthly household plan</Badge>}
      />

      <p role="status" className={`mb-3 text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p>
      <Button variant="outline" className="mb-3 w-full sm:hidden" aria-expanded={historyOpen} aria-controls="budget-history-panel" onClick={() => setHistoryOpen((value) => !value)}>{historyOpen ? "Hide spending history" : "Compare past category spending"}</Button>
      <div id="budget-history-panel" className={historyOpen ? "block" : "hidden sm:block"}><Card className="mb-4 shadow-xs"><CardHeader><CardTitle className="text-base">Is your target realistic?</CardTitle><p className="text-xs text-muted-foreground">Compare a category with previous imported months before setting its limit.</p></CardHeader><CardContent>
        <select className="mb-4 h-10 w-full rounded-lg border bg-background px-3 text-sm sm:w-64" aria-label="Category spending history" value={historyCategory} onChange={(event) => setHistoryCategory(event.target.value)}>{categoryDefinitions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
        <CategoryHistory name={historyCategory} transactions={transactions} month={month} target={budgets.find((item) => item.name === historyCategory)?.limit ?? 0} onUseAverage={(amount) => { const budget = budgets.find((item) => item.name === historyCategory); if (budget) void save({ kind: "budget", id: budget.id, value: { limit: amount, allocation: budget.allocation } }); }} pending={pending} canSet={budgets.some((item) => item.name === historyCategory)} />
      </CardContent></Card></div>
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={<WalletCards />} label="Monthly plan" value={formatMoney(totalLimit)} detail={`${budgets.length} categories`} />
        <SummaryCard icon={<CircleDollarSign />} label="Used so far" value={formatMoney(totalUsed)} detail={`${usedPercent}% including pending`} />
        <SummaryCard icon={<PiggyBank />} label="Available" value={formatMoney(remaining)} detail={remaining >= 0 ? "left for the month" : "over plan"} />
      </section>

      <Card className="mt-4 shadow-xs">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Household categories</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Posted and pending purchases count toward each limit.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setManage((value) => !value)}>{manage ? "Close categories" : "Manage categories"}</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {manage ? <div className="mb-4 space-y-3 rounded-xl border p-4"><p className="text-xs leading-5 text-muted-foreground">Add a category, or hide a budget you do not want to track. Hidden budgets keep transaction history and merchant rules. Scheduled bills still count in the forecast.</p><form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void save({ kind: "category", id: `category-${crypto.randomUUID()}`, value: { name: categoryName.trim(), hidden: false } }, () => setCategoryName("")); }}><Input aria-label="New category name" required maxLength={40} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Pets or Home maintenance" className="min-w-0 flex-1" /><Button type="submit" disabled={pending}>Add category</Button></form><div className="flex flex-wrap gap-2">{categoryDefinitions.filter((item) => item.hidden).map((item) => <Button key={item.id} size="sm" variant="outline" disabled={pending} onClick={() => save({ kind: "category", id: item.id, value: { name: item.name, hidden: false } })}>Restore {item.name}</Button>)}</div></div> : null}
          {budgets.map((budget) => {
            const used = budget.spent + budget.pending;
            const percentage = budget.limit ? Math.round((used / budget.limit) * 100) : 0;
            const day = mode === "preview" ? 4 : Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).slice(-2));
            const [year, monthNumber] = month.split("-").map(Number);
            const days = new Date(year, monthNumber, 0).getDate();
            const variable = ["Groceries", "Eating out", "Transport", "Clothing", "Entertainment", "Shopping"].includes(budget.name);
            const projected = variable ? Math.round(used / day * days) : null;
            const personSpend = (person: string) => transactions.filter((item) => item.date.startsWith(month) && !item.isTransfer && item.category === budget.name && item.person === person).reduce((sum, item) => sum + expenseContribution(item), 0);
            return (
              <div key={budget.id} className="rounded-xl border bg-background p-4">
                <div className="flex items-start gap-3">
                  <CategoryIcon name={budget.icon} color={budget.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{budget.name}</p>
                        <button className="mt-1 text-xs text-primary hover:underline" onClick={() => { setHistoryCategory(budget.name); setHistoryOpen(true); requestAnimationFrame(() => document.getElementById("budget-history")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>Compare previous months ↑</button>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatMoney(budget.spent)} posted{budget.pending ? ` · ${formatMoney(budget.pending)} pending` : ""}
                        </p>
                      </div>
                      {editing === budget.id ? (
                        <LimitEditor value={budget.limit / 100} share={budget.allocation?.stefan} pending={pending} onSave={(value, share) => saveLimit(budget, value, share)} onCancel={() => setEditing(null)} />
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={() => setEditing(budget.id)}>
                          <Pencil className="size-3" /> {formatMoney(budget.limit)}
                        </Button>
                      )}
                      {manage ? <Button variant="ghost" size="sm" disabled={pending} onClick={() => save({ kind: "category", id: budget.id, value: { name: budget.name, hidden: true } })}>Hide budget</Button> : null}
                    </div>
                    <Progress value={Math.min(percentage, 100)} className="mt-3 h-2" />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={used > budget.limit ? "font-medium text-destructive" : "text-muted-foreground"}>{budget.limit ? `${percentage}% used` : "Set a limit"}</span>
                      <span className="text-muted-foreground">{formatMoney(budget.limit - used)} left</span>
                    </div>
                    {projected !== null ? <p className="mt-2 text-[11px] text-muted-foreground">At this pace: {formatMoney(projected)} by month end · {day < 7 ? "early estimate" : "simple daily run rate"}</p> : null}
                    {budget.allocation ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-1">{names.stefan} {budget.allocation.stefan}% · {formatMoney(personSpend("Stefan"))} of {formatMoney(Math.round(budget.limit * budget.allocation.stefan / 100))}</span>
                        <span className="rounded-full bg-secondary px-2 py-1">{names.partner} {budget.allocation.partner}% · {formatMoney(personSpend("Partner"))} of {formatMoney(Math.round(budget.limit * budget.allocation.partner / 100))}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        {mode === "live" ? "Spending is calculated from your live Redbark feed." : "Preview spending is shown until authenticated Redbark access is configured."}
      </p>
    </div>
  );
}

function CategoryHistory({ name, transactions, month, target, onUseAverage, pending, canSet }: { name: string; transactions: FinanceTransaction[]; month: string; target: number; onUseAverage: (amount: number) => void; pending: boolean; canSet: boolean }) {
  const rows = monthlyHistory(transactions, month).map((row) => ({ ...row, spending: transactions.filter((item) => item.date.startsWith(row.month) && item.category === name && item.status === "posted" && !item.isTransfer && item.currency.toLowerCase() === "aud").reduce((sum, item) => sum + expenseContribution(item), 0) }));
  const past = rows.filter((row) => !row.current && row.count > 0);
  const average = past.length ? Math.round(past.reduce((sum, row) => sum + row.spending, 0) / past.length) : null;
  const max = Math.max(1, target, ...rows.map((row) => row.spending));
  return <div id="budget-history" className="scroll-mt-24"><div className="mb-4 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Current monthly target</p><p className="text-xl font-semibold">{formatMoney(target)}</p></div><div><p className="text-xs text-muted-foreground">Past imported month average</p><p className="text-xl font-semibold">{average === null ? "More history needed" : formatMoney(average)}</p></div><div><p className="text-xs text-muted-foreground">Past monthly range</p><p className="text-sm font-semibold">{past.length ? `${formatMoney(Math.min(...past.map((row) => row.spending)))} – ${formatMoney(Math.max(...past.map((row) => row.spending)))}` : "No prior months"}</p></div></div>
    <div className="space-y-3">{rows.map((row) => <Link key={row.month} href={activityLink({ month: row.month, category: name, status: "posted", flow: "spending" })} className="block rounded-lg p-2 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"><div className="mb-1 flex justify-between gap-3 text-xs"><span>{monthLabel(row.month)}{row.current ? " · to date" : ""}</span><span className="font-semibold">{formatMoney(row.spending)} →</span></div><div className="relative h-5 rounded bg-secondary"><div className={`h-full rounded ${row.spending > target && target > 0 ? "bg-orange-500/75" : "bg-primary/65"}`} style={{ width: `${Math.max(0, row.spending) / max * 100}%` }} />{target > 0 ? <span title="Budget target" className="absolute inset-y-0 border-l-2 border-dashed border-foreground" style={{ left: `${target / max * 100}%` }} /> : null}</div></Link>)}</div>
    <div className="mt-4 flex flex-wrap items-center gap-3">{average !== null && canSet ? <Button size="sm" variant="outline" disabled={pending} onClick={() => onUseAverage(Math.max(0, average))}>Use past average as target</Button> : null}<p className="max-w-xl text-xs leading-5 text-muted-foreground">Dashed line = target. Posted expenses after refunds; transfers excluded. Current month is excluded from the average. Earlier imported months may also be incomplete—check the underlying transactions before adopting a target.</p></div>
  </div>;
}

function LimitEditor({ value, share, pending, onSave, onCancel }: { value: number; share?: number; pending: boolean; onSave: (value: number, share: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(String(value));
  const [allocation, setAllocation] = useState(share === undefined ? "" : String(share));
  return (
    <form
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(Number(draft) || 0, allocation);
      }}
    >
      <span className="text-xs text-muted-foreground">$</span>
      <Input className="h-8 w-24 text-right text-xs" type="number" min="0" step="10" value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus aria-label="Monthly budget limit" />
      <Input className="h-8 w-28 text-xs" type="number" min="0" max="100" step="1" placeholder="Shared" value={allocation} onChange={(event) => setAllocation(event.target.value)} aria-label="Stefan allocation percent, blank for shared" />
      <Button disabled={pending} type="submit" size="sm" className="h-8 px-2 text-xs">{pending ? "Saving" : "Save"}</Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card className="shadow-xs">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary [&>svg]:size-4.5">{icon}</span>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}
